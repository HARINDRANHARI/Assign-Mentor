const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

mongoose.connect("mongodb://localhost:27017/mentor_student_db", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const mentorSchema = new mongoose.Schema({
    name: String,
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }]
});
const studentSchema = new mongoose.Schema({
    name: String,
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "Mentor", default: null },
    previousMentors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Mentor" }]
});

const Mentor = mongoose.model("Mentor", mentorSchema);
const Student = mongoose.model("Student", studentSchema);

// Create a Mentor
app.post("/mentors", async (req, res) => {
    const mentor = new Mentor(req.body);
    await mentor.save();
    res.status(201).json(mentor);
});

// Create a Student
app.post("/students", async (req, res) => {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
});

// Assign multiple students to a mentor
app.post("/mentors/:mentorId/assign-students", async (req, res) => {
    const { mentorId } = req.params;
    const { studentIds } = req.body;
    const mentor = await Mentor.findById(mentorId);
    
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    
    await Student.updateMany(
        { _id: { $in: studentIds }, mentor: null },
        { $set: { mentor: mentorId } }
    );

    mentor.students.push(...studentIds);
    await mentor.save();
    res.json({ message: "Students assigned successfully", mentor });
});

// Get students without a mentor
app.get("/students/unassigned", async (req, res) => {
    const students = await Student.find({ mentor: null });
    res.json(students);
});

// Assign or Change Mentor for a Student
app.put("/students/:studentId/assign-mentor", async (req, res) => {
    const { studentId } = req.params;
    const { mentorId } = req.body;
    const student = await Student.findById(studentId);

    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.mentor) student.previousMentors.push(student.mentor);
    
    student.mentor = mentorId;
    await student.save();
    res.json({ message: "Mentor assigned successfully", student });
});

// Get all students assigned to a particular mentor
app.get("/mentors/:mentorId/students", async (req, res) => {
    const { mentorId } = req.params;
    const mentor = await Mentor.findById(mentorId).populate("students");
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    res.json(mentor.students);
});

// Get the previous mentors of a student
app.get("/students/:studentId/previous-mentors", async (req, res) => {
    const { studentId } = req.params;
    const student = await Student.findById(studentId).populate("previousMentors");
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json(student.previousMentors);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
