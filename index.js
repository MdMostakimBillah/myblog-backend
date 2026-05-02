import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Post from "./models/Post.js";
import User from "./models/User.js";

dotenv.config();

const app = express();

// app.use(cors());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://your-blog.vercel.app"  // deploy এর পরে actual URL দিয়ে বদলাবেন
  ]
}));
app.use(express.json({ limit: '50mb' }));

// Mongodb Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database successfully connected");
  })
  .catch((error) => {
    console.log("Database connection failed.")
    console.error("error is: ", error.message);
  })

// inisial test for Backend Connection 
app.get("/", (req, res) => {
  res.send("For checking the server got /db-check path")
})

// Check the connection status 
app.get("/db-check", (req, res) => {
  const state = mongoose.connection.readyState;
  let status = "Unkonwn";

  if (state === 1) status = "Connected";
  else if (state === 0) status = "Disconnected";
  else if (state === 2) status = "Connecting...";

  res.json({
    readyState: state,
    status: status,
    dbName: mongoose.connection.db?.databaseName || "Not found Yet!"
  })
})


// Send data into the Backend
app.post("/api/posts", (req, res) => {
  console.log("Data comes from Backend", req.body);

  const newPost = new Post(req.body);

  newPost.save()
    .then((savedPost) => {
      console.log("Saved post into db: ", savedPost);

      res.status(201).json({
        success: true,
        message: "Data came successfuly",
        //recivedData : req.body,
        //serverTime: new Date().toISOString()
        postId: savedPost._id,
        yourId: savedPost.id,
        savedData: savedPost
      })
    })
    .catch((error) => {
      console.error("Data Save Problem", error.message);
      res.status(500).json({
        success: false,
        message: "পোস্ট সেভ করতে সমস্যা হয়েছে",
        error: error.message
      })
    })
})


// Get data from backend single id
app.get("/api/posts/:id", async (req, res) => {
  try {
    // const post = await Post.findById(req.params.id);
    const post = await Post.findById(req.params.id).populate("authorId", "firstName lastName profilePic");

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: "পোস্ট পাওয়া যায়নি" 
      });
    }

    res.json({
      success: true,
      post: post
    });
  } catch (err) {
    console.log("Single post error:", err.message);
    res.status(500).json({ 
      success: false, 
      message: "সার্ভারে সমস্যা হয়েছে" 
    });
  }
});

app.get("/api/posts", async (req, res) => {
  try{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-content');
    
    const total = await Post.countDocuments();

    res.json({
      success: true,
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit)
    });

  }catch(error){
    res.status(500).json({ success: false, message: error.message });
  }
})

// এটি আপনার Post Manage পেজের জন্য কাজ করবে
app.get("/api/my-posts/:username", async (req, res) => {
  try {
   
    const posts = await Post.find({ authorName: req.params.username }).sort({ createdAt: -1 });

    res.json({
      success: true,
      posts: posts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// app.put("/api/auth/update-profile", async (req, res) => {
//   const { userId, about } = req.body;
//   await User.findByIdAndUpdate(userId, { about: about });
//   res.json({ success: true });
// });

app.put("/api/auth/update-profile", async (req, res) => {
  try {
    const { userId, ...updateFields } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: "userId দরকার" });

    const allowed = ["about", "bio", "firstName", "lastName", "email", 
                 "qualification", "timeline", "profilePic",
                 "location", "socialLinks"];
    const update = {};
    allowed.forEach(k => { if (k in updateFields) update[k] = updateFields[k]; });

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// আপনার ব্যাকএন্ডে এই কোডটি আছে কি না নিশ্চিত করুন
// app.get("/api/my-posts/:username", async (req, res) => {
//     try {
//         const username = req.params.username;
//         // ডাটাবেজে authorName ফিল্ড দিয়ে সার্চ করা
//         const posts = await Post.find({ authorName: username }).sort({ createdAt: -1 });

//         res.json({
//             success: true,
//             posts: posts
//         });
//     } catch (err) {
//         res.status(500).json({ success: false, message: "সার্ভারে সমস্যা হয়েছে" });
//     }
// });

// DELETE একটি পোস্ট
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        message: "পোস্ট পাওয়া যায়নি"
      });
    }

    res.json({
      success: true,
      message: "পোস্ট সফলভাবে ডিলিট হয়েছে"
    });
  } catch (err) {
    console.log("Delete Error:", err.message);
    res.status(500).json({
      success: false,
      message: "ডিলিট করতে সমস্যা হয়েছে",
      error: err.message
    });
  }
});

// ====================== EDIT / UPDATE POST ======================
app.put("/api/posts/:id", async (req, res) => {
  try {
    const { title, firstParagraph, banner, topic, date, status, content } = req.body;

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title,
        firstParagraph,
        banner,
        topic,
        date,
        status,
        content
      },
      { new: true }   // updated document ফেরত দিবে
    );

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: "পোস্ট পাওয়া যায়নি"
      });
    }

    res.json({
      success: true,
      message: "পোস্ট সফলভাবে আপডেট হয়েছে",
      post: updatedPost
    });

  } catch (err) {
    console.log("Update Error:", err.message);
    res.status(500).json({
      success: false,
      message: "আপডেট করতে সমস্যা হয়েছে",
      error: err.message
    });
  }
});

// ====================== AUTH ROUTES ======================
app.post("/api/auth/register", async (req, res) => {
    try {
        // ১. এখানে profilePic যোগ করা হয়েছে
        const { firstName, lastName, username, email, password, qualification, about, skills, profilePic } = req.body;

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, Email এবং Password দিতে হবে"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] 
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "এই ইমেইল অথবা ইউজারনেম ইতিমধ্যে ব্যবহৃত হয়েছে"
            });
        }

        const newUser = new User({
            firstName,
            lastName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password,                    // পরে bcrypt দিয়ে hash করবো
            qualification,
            about,
            skills: skills || [],
            profilePic: profilePic || "" // ২. এখানে ডাটাবেজে সেভ করার জন্য profilePic দেওয়া হয়েছে
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: "অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে",
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                profilePic: newUser.profilePic // ৩. রেসপন্সেও ছবি পাঠানো হচ্ছে
            }
        });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({
            success: false,
            message: "সার্ভারে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
        });
    }
});


// ==================== LOGIN ROUTE ====================
app.post("/api/auth/login", async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Username/Email এবং Password দিতে হবে"
            });
        }

        // Username অথবা Email দিয়ে খুঁজে বের করা
        const user = await User.findOne({
            $or: [
                { username: identifier.toLowerCase() },
                { email: identifier.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "এই ইউজারনেম/ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি"
            });
        }

        // Password চেক (এখন plain text — পরে bcrypt দিয়ে hash করবো)
        if (user.password !== password) {
            return res.status(400).json({
                success: false,
                message: "পাসওয়ার্ড ভুল হয়েছে"
            });
        }

        // লগইন সফল
        res.status(200).json({
            success: true,
            message: "লগইন সফল হয়েছে",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                qualification: user.qualification,
                about: user.about,
                skills: user.skills,
                profilePic: user.profilePic,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "সার্ভারে সমস্যা হয়েছে"
        });
    }
});

// user account 
app.get("/api/auth/user-profile/:username", async (req, res) => {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ success: false });
    
    // ঐ ইউজারের সব পোস্ট খুঁজে বের করা
    const posts = await Post.find({ authorName: req.params.username });
    
    res.json({ success: true, user, posts }); 
});


app.post("/api/posts/:id/like", async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);

        if (!post.likes.includes(userId)) {
            // যদি আগে লাইক না দিয়ে থাকে, তবে আইডি পুশ করো
            post.likes.push(userId);
            await post.save();
            return res.json({ success: true, message: "Liked", likesCount: post.likes.length });
        } else {
            // যদি আগে লাইক দিয়ে থাকে, তবে লাইক রিমুভ করো (Toggle)
            post.likes = post.likes.filter(id => id.toString() !== userId);
            await post.save();
            return res.json({ success: true, message: "Unliked", likesCount: post.likes.length });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Sever is running in http://localhost:${PORT}`)
})
