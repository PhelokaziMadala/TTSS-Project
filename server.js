require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Database setup (using simple JSON file for demonstration)
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

// Initialize database with default data if empty
db.defaults({
  users: [],
  cohorts: [
    { id: 'ai-academy', name: 'AI Academy' },
    { id: 'cloud-computing', name: 'Cloud Computing' },
    { id: 'demand', name: 'Demand' }
  ],
  groups: [
    { id: 'tech-devs', name: 'Tech Devs', cohortId: 'ai-academy' },
    { id: 'data-team', name: 'Data Team', cohortId: 'ai-academy' },
    { id: 'ui-crew', name: 'UI Crew', cohortId: 'ai-academy' },
    { id: 'ai-experts', name: 'AI Experts', cohortId: 'ai-academy' }
  ],
  students: [
    { id: '1', name: 'Lelethu Lingela', email: 'lelethu@example.com', groupId: 'tech-devs' },
    { id: '2', name: 'Lucky Mkhetyeva', email: 'lucky@example.com', groupId: 'tech-devs' },
    { id: '3', name: 'Phelokazi Madala', email: 'phelokazi@example.com', groupId: 'tech-devs' },
    { id: '4', name: 'Wisani Magwaza', email: 'wisani@example.com', groupId: 'tech-devs' },
    { id: '5', name: 'Zimkhitha Mbanyaru', email: 'zimkhitha@example.com', groupId: 'tech-devs' }
  ],
  evaluations: []
}).write();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from root
app.use(express.static(__dirname));

// Set view engine to EJS for any dynamic pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (req.session.user?.role !== role) {
      return res.status(403).send('Access denied');
    }
    next();
  };
};

// API Routes
app.post('/api/login', (req, res) => {
  const { email, password, role } = req.body;
  
  // In a real app, you would query your database here
  const user = db.get('users').find({ email, role }).value();
  
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.name.charAt(0).toUpperCase()
    };
    return res.json({ success: true, redirect: getDashboardForRole(user.role) });
  }
  
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/signup', (req, res) => {
  const { name, surname, cohort, email, password, confirmPassword } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match' });
  }
  
  const existingUser = db.get('users').find({ email }).value();
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  
  const newUser = {
    id: uuidv4(),
    name: `${name} ${surname}`,
    email,
    password: bcrypt.hashSync(password, 10),
    role: 'candidate',
    cohort,
    createdAt: new Date().toISOString()
  };
  
  db.get('users').push(newUser).write();
  
  res.json({ success: true, redirect: '/student-dashboard.html' });
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

// Dashboard data endpoints
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
  const stats = {
    totalCohorts: db.get('cohorts').size().value(),
    totalGroups: db.get('groups').size().value(),
    totalStudents: db.get('students').size().value(),
    recentEvaluations: db.get('evaluations').size().value()
  };
  res.json(stats);
});

app.get('/api/cohorts', requireAuth, (req, res) => {
  res.json(db.get('cohorts').value());
});

app.get('/api/groups/:cohortId', requireAuth, (req, res) => {
  const groups = db.get('groups').filter({ cohortId: req.params.cohortId }).value();
  res.json(groups);
});

app.get('/api/students/:groupId', requireAuth, (req, res) => {
  const students = db.get('students').filter({ groupId: req.params.groupId }).value();
  res.json(students);
});

// Evaluation endpoints
app.post('/api/evaluations', requireAuth, (req, res) => {
  const evaluation = {
    id: uuidv4(),
    ...req.body,
    evaluatorId: req.session.user.id,
    date: new Date().toISOString(),
    status: 'completed'
  };
  
  db.get('evaluations').push(evaluation).write();
  res.json({ success: true });
});

app.get('/api/evaluations/recent', requireAuth, (req, res) => {
  const evaluations = db.get('evaluations')
    .take(5)
    .orderBy('date', 'desc')
    .value();
  
  res.json(evaluations);
});

app.get('/api/evaluations/student/:studentId', requireAuth, (req, res) => {
  const evaluations = db.get('evaluations')
    .filter({ studentId: req.params.studentId })
    .orderBy('date', 'desc')
    .value();
  
  res.json(evaluations);
});

// Serve HTML files
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login.html', (req, res) => {
  if (req.session.user) {
    return res.redirect(getDashboardForRole(req.session.user.role));
  }
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'signup.html'));
});

// Protected routes
app.get('/admin-dashboard.html', requireAuth, requireRole('admin'), (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-dashboard.html'));
});

app.get('/student-dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'student-dashboard.html'));
});

// Helper function to get dashboard based on role
function getDashboardForRole(role) {
  switch (role) {
    case 'admin': return '/admin-dashboard.html';
    case 'mentor': return '/mentor-dashboard.html'; // You might want to create this
    case 'candidate': return '/student-dashboard.html';
    default: return '/';
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});