import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import Post from "./models/Post.js";
import User from "./models/User.js";
import cron from "node-cron";

dotenv.config();

const app = express();

// app.use(cors());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://my-speach.vercel.app",
    "https://myblog-frontend-fyhtjhjki-mdmostakimbillahs-projects.vercel.app"
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


// app.get("/api/posts", async (req, res) => {
//   try {
//     const page  = parseInt(req.query.page)  || 1;
//     const limit = parseInt(req.query.limit) || 9;
//     const skip  = (page - 1) * limit;
//     const topic = req.query.topic;

//     const query = { status: "publish" };
//     if (topic) query.topic = topic;

//     const posts = await Post.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select("-content");

//     const total = await Post.countDocuments(query);

//     res.json({
//       success: true,
//       posts,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       hasMore: page < Math.ceil(total / limit),
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// app.get("/api/posts", async (req, res) => {
//   const topics = req.query.topics;
//   console.log("topics query:", topics);
//   console.log("query object:", req.query);
//   try {
//     const page   = parseInt(req.query.page)   || 1;
//     const limit  = parseInt(req.query.limit)  || 9;
//     const skip   = (page - 1) * limit;
//     const topic  = req.query.topic;
//     const topics = req.query.topics; // ✅ multiple topics

//     const query = { status: "publish" };
//     if (topic)  query.topic = topic;
//     if (topics) query.topic = { $in: topics.split(",") }; // ✅ comma separated

//     const posts = await Post.find(query)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .select("-content");

//     const total = await Post.countDocuments(query);

//     res.json({
//       success: true,
//       posts,
//       currentPage: page,
//       totalPages: Math.ceil(total / limit),
//       hasMore: page < Math.ceil(total / limit),
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// ✅ এই অংশটা replace করো
app.get("/api/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;
    const topic = req.query.topic;
    const topics = req.query.topics;
    const skill = req.query.skill; // ✅ নতুন

    const query = { status: "publish" };
    if (topic) query.topic = topic;
    if (topics) query.topic = { $in: topics.split(",") };

    // ✅ skill filter — authorName এর posts যেখানে skill match করে
    // if (skill) {
    //   // skill সম্পর্কিত posts খুঁজতে হলে author এর skills check করতে হবে
    //   // তাই আগে সেই skill আছে এমন users খুঁজি
    //   const usersWithSkill = await User.find({ skills: skill }).select("username");
    //   const usernames = usersWithSkill.map(u => u.username);
    //   query.authorName = { $in: usernames };
    // }
    if (skill) {
      query.topic = `skill:${skill}`;
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-content");

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      hasMore: page < Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Permission accept
app.put("/api/auth/accept-permission", async (req, res) => {
  try {
    const { userId, permission } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false });

    user.pendingPermissions = user.pendingPermissions.filter(
      p => p.permission !== permission
    );
    if (!user.permissions.includes(permission)) {
      user.permissions.push(permission);
    }
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Permission decline
app.put("/api/auth/decline-permission", async (req, res) => {
  try {
    const { userId, permission } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false });

    user.pendingPermissions = user.pendingPermissions.filter(
      p => p.permission !== permission
    );
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Permission revoke — যে দিয়েছে সে বাতিল করবে
app.put("/api/auth/revoke-permission", async (req, res) => {
  try {
    const { username, permission } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false });

    user.permissions = user.permissions.filter(p => p !== permission);
    await user.save();
    res.json({ success: true, message: "Permission বাতিল হয়েছে" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// যাদের নির্দিষ্ট permission আছে তাদের list
app.get("/api/auth/permission-list", async (req, res) => {
  try {
    const { permission } = req.query;
    const users = await User.find(
      { permissions: permission },
      "username firstName lastName profilePic"
    );
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

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


// Admin যেকোনো user কে permission দিতে পারবে
app.put("/api/auth/update-permission", async (req, res) => {
  try {
    const { username, permission, from } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });

    // আগে থেকে আছে কিনা চেক
    const alreadyHas = user.permissions.includes(permission);
    const alreadyPending = user.pendingPermissions?.some(p => p.permission === permission);

    if (alreadyHas || alreadyPending) {
      return res.json({ success: false, message: "ইতিমধ্যে আছে বা অপেক্ষমান" });
    }

    // ✅ সরাসরি না — pending এ রাখো
    user.pendingPermissions.push({ permission, from });
    await user.save();

    res.json({ success: true, message: "অনুরোধ পাঠানো হয়েছে" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin যেকোনো user এর permission বাতিল করতে পারবে
app.put("/api/auth/remove-permission", async (req, res) => {
  try {
    const { username, permission } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });

    user.permissions = user.permissions.filter(p => p !== permission);
    await user.save();

    res.json({ success: true, message: "Permission বাতিল করা হয়েছে" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

    const allowed = [
      "about", "bio", "firstName", "lastName", "email",
      "qualification", "timeline", "profilePic",
      "location", "socialLinks", "skills"
    ];

    const update = {};
    allowed.forEach(k => { if (k in updateFields) update[k] = updateFields[k]; });

    // ✅ skills fix: [{name: "প্রবন্ধ রচনা"}] → ["প্রবন্ধ রচনা"]
    // frontend থেকে object array আসলে string array তে convert করা
    if (update.skills && Array.isArray(update.skills)) {
      update.skills = update.skills.map(s =>
        typeof s === "object" ? s.name : s
      ).filter(Boolean);
    }

    const user = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "ইউজার পাওয়া যায়নি" });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});




app.post("/api/ai/summary", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content: `You are a professional content rewriter and blog preview writer. I will provide a story, article, paragraph, or mixed Bangla-English writing. Your task is to rewrite the content into a short, engaging, and emotionally accurate preview within 70-80 words. If Bangla 150 words. If English 100 words max. The preview should capture the essence and tone of the original content while being concise and compelling.

              Purpose:

              * This text will be used inside a blog card or preview section.
              * It should briefly capture the main idea while creating curiosity and interest so readers feel motivated to read the full blog.

              Language Rules:

              * If the original content is fully in Bangla, write the output fully in Bangla.
              * If the original content is fully in English, write the output fully in English.
              * If the content contains both Bangla and English, use a natural mixed style where appropriate.

              Writing Rules:

              * Do not write a full summary or detailed explanation.
              * Keep the core emotion, tone, and message of the original content.
              * Make it concise, smooth, and highly engaging.
              * If the content is emotional, make the preview emotional.
              * If it is sad, use a sorrowful tone.
              * If it is motivational, make it inspiring.
              * If it is suspenseful or thoughtful, maintain that feeling.
              * Avoid introductions, conclusions, and unnecessary details.
              * The writing should feel human, modern, and hook the reader emotionally or mentally.
              * Maximum length: English 100 words and Bangla 150 words.

              `,
            },
            {
              role: "user",
              content: text,
            },
          ],
          max_tokens: 400,
        }),
      },
    );

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || "";
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


app.get("/api/notifications/:username", async (req, res) => {
  try {
    const posts = await Post.find({ authorName: req.params.username })
      .select("title likes createdAt")
      .lean();

    // সব liked userId collect করো
    const allUserIds = [...new Set(
      posts.flatMap(p => p.likes || [])
    )];

    // userId থেকে username আনো
    const users = await User.find(
      { _id: { $in: allUserIds } },
      "username firstName lastName profilePic"
    ).lean();

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    // প্রতিটি post এর জন্য notification বানাও
    const notifications = posts
      .filter(p => p.likes?.length > 0)
      .flatMap(p =>
        (p.likes || []).map(userId => ({
          postId:    p._id,
          postTitle: p.title,
          user:      userMap[userId?.toString()] || null,
          userId,
        }))
      )
      .filter(n => n.user); // user না পেলে বাদ দাও

    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Auto publish cron job ──
// প্রতি ঘণ্টায় একবার চেক করবে
cron.schedule("0 * * * *", async () => {
    try {
        const today = new Date().toISOString().split("T")[0];
        
        // যেসব post unpublish আছে এবং তারিখ আজকের বা আগের
        const postsToPublish = await Post.find({
            status: "unpublish",
            date: { $lte: today }
        });

        if (postsToPublish.length === 0) return;

        // সবগুলো publish করো
        await Post.updateMany(
            { 
                status: "unpublish",
                date: { $lte: today }
            },
            { $set: { status: "publish" } }
        );

        console.log(`✅ ${postsToPublish.length} টি পোস্ট auto publish হয়েছে`);
    } catch (err) {
        console.error("Auto publish error:", err.message);
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
        role: user.role,
        permissions: user.permissions,
        pendingPermissions: user.pendingPermissions,
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


// =====================================================
// ২. change-password — নতুন route
// update-profile route এর নিচে এটি যোগ করুন
// =====================================================
app.put("/api/auth/change-password", async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    console.log("change-password hit:", { userId, currentPassword, newPassword }); // debug

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "সব তথ্য দিতে হবে"
      });
    }

    // ✅ findById এর বদলে findOne ব্যবহার — বেশি reliable
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "ইউজার পাওয়া যায়নি"
      });
    }

    console.log("DB password:", user.password); // debug
    console.log("Input password:", currentPassword); // debug

    // বর্তমান পাসওয়ার্ড মেলানো (plain text)
    if (user.password !== currentPassword) {
      return res.status(400).json({
        success: false,
        message: "বর্তমান পাসওয়ার্ড ভুল হয়েছে"
      });
    }

    // ✅ findByIdAndUpdate দিয়ে save — validation bypass হবে না কিন্তু
    // runValidators: false দিলে minlength চেক হবে না — তাই newPassword length
    // frontend থেকেই check করা হচ্ছে (৬ অক্ষর), এখানে শুধু save
    await User.findByIdAndUpdate(
      userId,
      { password: newPassword },
      { new: true, runValidators: false }
    );

    res.json({
      success: true,
      message: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে"
    });

  } catch (err) {
    console.error("change-password error:", err); // debug
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Sever is running in http://localhost:${PORT}`)
})
