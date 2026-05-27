import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 4
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    qualification: {
        type: String,
        enum: ["ssc", "hsc", "diploma", "bsc", "msc", "phd", ""],
        default: ""
    },
    about: {
        type: String,
        default: "",
        trim: true
    },
    skills: {
        type: [String],
        default: []
    },
    profilePic: {
        type: String,
        default: ""
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    bio: {
        type: String,
        default: "আমি খুবই সাধারণ একজন লেখক...",
        trim: true
    },
    timeline: {
        type: [{ year: String, title: String, place: String, desc: String }],
        default: []
    },
    location: {
        type: String,
        default: "",
        trim: true
    },
    socialLinks: {
        twitter: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        youtube: { type: String, default: "" },
        facebook: { type: String, default: "" },
    },
    permissions: {
        type: [String],
        default: []
    },
    pendingPermissions: {
        type: [{
            permission: String,
            from: String, // কে দিয়েছে
            createdAt: { type: Date, default: Date.now }
        }],
        default: []
    }
}, {
    timestamps: true
});

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);
export default User;