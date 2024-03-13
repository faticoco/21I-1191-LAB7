const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;

let users = [];
let tasks = [];

app.use(express.json());

function authenticateUser(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).send("Access denied. Token not provided");
  }

  try {
    const decoded = jwt.verify(token, "secretKey");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).send("Invalid token");
  }
}

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const existingUser = users.find((user) => user.username === username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };
    users.push(newUser);
    res.status(201).send("User registered successfully");
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).send("Error registering user");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.find((user) => user.username === username);
    if (!user) {
      return res.status(404).send("User not found");
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send("Invalid password");
    }
    const token = jwt.sign({ userId: user.username }, "secretKey");
    res.status(200).send({ token });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Error logging in");
  }
});

app.post("/tasks", authenticateUser, (req, res) => {
  try {
    const { title, description, dueDate, category, priority } = req.body;
    const newTask = {
      title,
      description,
      dueDate,
      category,
      priority,
      completed: false,
      userId: req.user.userId,
    };
    tasks.push(newTask);
    res.status(201).send("Task created successfully");
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).send("Error creating task");
  }
});

app.put("/tasks/:taskId/complete", authenticateUser, (req, res) => {
  try {
    const taskId = req.params.taskId;
    const taskIndex = tasks.findIndex(
      (task) => task.userId === req.user.userId && task._id === taskId
    );
    if (taskIndex === -1) {
      return res.status(404).send("Task not found");
    }
    tasks[taskIndex].completed = true;
    res.status(200).send("Task marked as completed");
  } catch (error) {
    console.error("Error marking task as completed:", error);
    res.status(500).send("Error marking task as completed");
  }
});

app.get("/tasks", authenticateUser, (req, res) => {
  try {
    const userTasks = tasks.filter((task) => task.userId === req.user.userId);
    res.status(200).json(userTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send("Error fetching tasks");
  }
});

app.get("/tasks/sort/:sortBy", authenticateUser, (req, res) => {
  try {
    const sortBy = req.params.sortBy;
    let sortedTasks;
    switch (sortBy) {
      case "dueDate":
        sortedTasks = tasks
          .filter((task) => task.userId === req.user.userId)
          .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        break;
      case "category":
        sortedTasks = tasks
          .filter((task) => task.userId === req.user.userId)
          .sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "completionStatus":
        sortedTasks = tasks
          .filter((task) => task.userId === req.user.userId)
          .sort((a, b) => a.completed - b.completed);
        break;
      default:
        return res.status(400).send("Invalid sorting parameter");
    }
    res.status(200).json(sortedTasks);
  } catch (error) {
    console.error("Error sorting tasks:", error);
    res.status(500).send("Error sorting tasks");
  }
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
