import userModel from "../models/userModel.js";
import transactionModel from "../models/transactionModel.js";
import razorpay from "razorpay";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

/* =========================
   REGISTER USER
========================= */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Missing Details" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);

    res.json({ success: true, token, user: { name: newUser.name } });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   LOGIN USER
========================= */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { name: user.name } });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   USER CREDITS
========================= */
const userCredits = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await userModel.findById(userId);

    res.json({
      success: true,
      credits: user.creditBalance,
      user: { name: user.name },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   RAZORPAY INIT (UNCHANGED)
========================= */
const razorpayInstance = new razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* =========================
   RAZORPAY PAYMENT
========================= */
const paymentRazorpay = async (req, res) => {
  try {
    const { userId, planId } = req.body;
    const userData = await userModel.findById(userId);

    if (!userData || !planId) {
      return res.json({ success: false, message: "Missing Details" });
    }

    let credits, plan, amount;

    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10;
        break;
      case "Advanced":
        plan = "Advanced";
        credits = 500;
        amount = 50;
        break;
      case "Business":
        plan = "Business";
        credits = 5000;
        amount = 250;
        break;
      default:
        return res.json({ success: false, message: "Plan not found" });
    }

    const transaction = await transactionModel.create({
      userId,
      plan,
      amount,
      credits,
      date: Date.now(),
    });

    const options = {
      amount: amount * 100,
      currency: process.env.CURRENCY,
      receipt: transaction._id,
    };

    razorpayInstance.orders.create(options, (error, order) => {
      if (error) {
        return res.json({ success: false, message: error });
      }
      res.json({ success: true, order });
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   VERIFY RAZORPAY
========================= */
const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id } = req.body;
    const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);

    if (orderInfo.status !== "paid") {
      return res.json({ success: false, message: "Payment Failed" });
    }

    const transaction = await transactionModel.findById(orderInfo.receipt);
    if (transaction.payment) {
      return res.json({ success: false, message: "Payment Failed" });
    }

    const user = await userModel.findById(transaction.userId);
    await userModel.findByIdAndUpdate(user._id, {
      creditBalance: user.creditBalance + transaction.credits,
    });

    await transactionModel.findByIdAndUpdate(transaction._id, {
      payment: true,
    });

    res.json({ success: true, message: "Credits Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   STRIPE INIT (FIXED)
========================= */
let stripeInstance = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe enabled");
} else {
  console.log("⚠️ Stripe disabled (no key)");
}

/* =========================
   STRIPE PAYMENT
========================= */
const paymentStripe = async (req, res) => {
  try {
    if (!stripeInstance) {
      return res
        .status(503)
        .json({ success: false, message: "Stripe payments disabled" });
    }

    const { userId, planId } = req.body;
    const { origin } = req.headers;

    const userData = await userModel.findById(userId);
    if (!userData || !planId) {
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    let credits, plan, amount;

    switch (planId) {
      case "Basic":
        plan = "Basic";
        credits = 100;
        amount = 10;
        break;
      case "Advanced":
        plan = "Advanced";
        credits = 500;
        amount = 50;
        break;
      case "Business":
        plan = "Business";
        credits = 5000;
        amount = 250;
        break;
      default:
        return res.json({ success: false, message: "Plan not found" });
    }

    const transaction = await transactionModel.create({
      userId,
      plan,
      amount,
      credits,
      date: Date.now(),
    });

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&transactionId=${transaction._id}`,
      cancel_url: `${origin}/verify?success=false&transactionId=${transaction._id}`,
      line_items: [
        {
          price_data: {
            currency: process.env.CURRENCY.toLowerCase(),
            product_data: { name: "Credit Purchase" },
            unit_amount: amount * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   VERIFY STRIPE
========================= */
const verifyStripe = async (req, res) => {
  try {
    if (!stripeInstance) {
      return res.json({ success: false, message: "Stripe not enabled" });
    }

    const { transactionId, success } = req.body;

    if (success !== "true") {
      return res.json({ success: false, message: "Payment Failed" });
    }

    const transaction = await transactionModel.findById(transactionId);
    if (transaction.payment) {
      return res.json({ success: false, message: "Payment Already Verified" });
    }

    const user = await userModel.findById(transaction.userId);
    await userModel.findByIdAndUpdate(user._id, {
      creditBalance: user.creditBalance + transaction.credits,
    });

    await transactionModel.findByIdAndUpdate(transaction._id, {
      payment: true,
    });

    res.json({ success: true, message: "Credits Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

/* =========================
   EXPORTS
========================= */
export {
  registerUser,
  loginUser,
  userCredits,
  paymentRazorpay,
  verifyRazorpay,
  paymentStripe,
  verifyStripe,
};
