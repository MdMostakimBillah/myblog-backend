import express from "express";
import cors from "cors";
import fs from "fs";
import multer from "multer";
import path from "path";

const app = express();

app.use(cors());

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend is Running👌");
})

app.post("/publish", (req, res) => {
    const newPost = req.body;

    let posts = [];
    if (fs.existsSync("posts.json")) {
        const fileData = fs.readFileSync("posts.json", "utf-8");
        posts = JSON.parse(fileData);
    }
    posts.push(newPost);

    fs.writeFileSync("posts.json", JSON.stringify(posts, null, 2));

    res.json({
        success : true,
        message: "Post saved successfully",
        totalPosts: posts.length,
    })
})

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

app.post("/publish", upload.single("image"), (req, res) => {
  const postData = JSON.parse(req.body.post);
  
  const newPost = {
    ...postData,
    image: req.file ? `/uploads/${req.file.filename}` : null,
  };

  console.log("POST:", newPost);

  res.json({
    success: true,
    message: "Post + image saved",
    data: newPost,
  });
});

app.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
})