 var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var passport = require('passport');
var flash = require('connect-flash');

// Database Config
require('./config/database');
// Load models and sync database
const syncModels = require('./models');
syncModels();

// Passport Config
require('./config/passport')(passport);

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var dashboardRouter = require('./routes/dashboard');
var dashboardEngineerRouter = require('./routes/dashboardEngineer');
var dashboardAccountantRouter = require('./routes/dashboardAccountant');
var adminRouter = require('./routes/admin');
var inventoryRouter = require('./routes/inventory');
var documentsRouter = require('./routes/documents');
var ticketsRouter = require('./routes/tickets');
var eventsRouter = require('./routes/events');
var engineeringRouter = require('./routes/engineering');
var accountingRouter = require('./routes/accounting');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Express Session
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

// Global Variables
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.user || null;
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/dashboard', dashboardRouter);
app.use('/dashboard/engineer', dashboardEngineerRouter);
app.use('/dashboard/accountant', dashboardAccountantRouter);
app.use('/admin', adminRouter);
app.use('/inventory', inventoryRouter);
app.use('/documents', documentsRouter);
app.use('/tickets', ticketsRouter);
app.use('/events', eventsRouter);
app.use('/engineering', engineeringRouter);
app.use('/accounting', accountingRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
