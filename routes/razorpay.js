const router = require("express").Router();
const PaymentDetails = require("../models/Razor");
const RazorPay = require("razorpay");
const { v4: uuidv4 } = require("uuid");
const Formidable = require("formidable");
const { request } = require("express");

// const razorpay = new RazorPay({
//   key_id: 'rzp_test_clL9tvTb07bZqL',
//   key_secret: 'D2DKPjpEwayyHhdlL8BZR64v',
// });

// //Serving comp logo
// router.get("/logo.png", (req, res) => {
//   try{
//   res.sendFile(path.join(__dirname, "logo.png"));
//   }catch(e){
//     console.log(e);
//   }
// });

// router.post("/razorpay", async (req, res) => {
//   const payment_capture = "1";
//   const amount = 499;
//   const currency = "INR";

//   const options = {
//     amount: amount / 100,
//     currency,
//     receipt: uuidv4(),
//     payment_capture,
//   };

//   try {
//     const response = await razorpay.orders.create(options);
//     console.log(response);
//     res.json({
//       currency: response.currency,
//       amount: response.amount,
//       id:response.id,
//     });
//   } catch (e) {
//     console.log(e);
//   }
// });

// router.post("/success",async (req,res)=>{

//   try{
//     const{
//       orderCreationId,
//       razorpayPaymentId,
//       razorpayOrderId,
//       razorpaySignature,
//     }=req.body;
//     const shasum=crypto.createHmac('sha256','D2DKPjpEwayyHhdlL8BZR64v');
//     shasum.update(`${orderCreationId}|${razorpayPaymentId}`);
//     const digest=shasum.digest('hex');

//     if(digest !== razorpaySignature)
//         return res.status(400).json({msg:'Transaction not legit!'});

//         const newPayment= PaymentDetails({
//           razorpayDetails:{
//             orderId:razorpayOrderId,
//             paymentId:razorpayPaymentId,
//             signature:razorpaySignature,
//           },
//           success:true,
//         })

//         await newPayment.save();
//         res.json({
//           msg:"Success",
//           orderId:razorpayOrderId,
//           paymentId:razorpayPaymentId,
//         })
//   }catch(error){
//     res.status(500).json(error);
//   }
// })

var razorPayInstance = new RazorPay({
  key_id: "rzp_test_clL9tvTb07bZqL",
  key_secret: "D2DKPjpEwayyHhdlL8BZR64v",
});

router.post("/createOrder", function (req, res, next) {
  params = {
    amount: req.body.amount /100,
    currency: "INR",
    receipt: uuidv4(),
    payment_capture: "1",
  };
  razorPayInstance.orders
    .create(params)
    .then(async (response) => {
      const razorpayKeyId = "rzp_test_clL9tvTb07bZqL";
      // Save orderId and other payment details
      const paymentDetail = new PaymentDetails({
        orderId: response.id,
        receiptId: response.receipt,
        amount: response.amount,
        currency: response.currency,
        createdAt: response.created_at,
        status: response.status,
      });
      try {
        // Render Order Confirmation page if saved succesfully
        await paymentDetail.save();
        // res.render("/pages/checkout", {
        //   title: "Confirm Order",
        //   razorpayKeyId: razorpayKeyId,
        //   paymentDetail: paymentDetail,
        // });
        res.status(500).json({
          title:"Confirm Order",
          razorpayKeyId:razorpayKeyId,
          paymentDetail:paymentDetail,
        }
        );
      } catch (err) {
        // Throw err if failed to save
       res.json({error:err})
      }
    })
    .catch((err) => {
      // Throw err if failed to create order
      if (err) throw err;
    });
});

router.post("/verify", async function (req, res, next) {
  body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
  let crypto = require("crypto");
  let expectedSignature = crypto
    .createHmac("sha256", "D2DKPjpEwayyHhdlL8BZR64v")
    .update(body.toString())
    .digest("hex");

  // Compare the signatures
  if (expectedSignature === req.body.razorpay_signature) {
    // if same, then find the previosuly stored record using orderId,
    // and update paymentId and signature, and set status to paid.
    await PaymentDetails.findOneAndUpdate(
      { orderId: req.body.razorpay_order_id },
      {
        paymentId: req.body.razorpay_payment_id,
        signature: req.body.razorpay_signature,
        status: "paid",
      },
      { new: true },
      function (err, doc) {
        // Throw er if failed to save
        if (err) {
          res.json({
            "Error":err,
          })
        }
        // Render payment success page, if saved succeffully
        res.status(500).json({
          title: "Payment verification successful",
          paymentDetail: doc,
        });
      }
    );
  } else {
    res.status(500).json({
      title: "Payment verification failed",
    });
  }
});

module.exports = router;
