if(process.env.NODE_ENV!=='production'){
    require('dotenv').config();
}
const express = require('express');
const app = express();
const path=require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const methodOverride=require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport=require('passport');
const LocalStrategy = require('passport-local');

const AppError = require('./utilities/AppError');
const wrapasync = require('./utilities/wrapasync');
const Manager = require('./models/manager');
const Employee = require('./models/employees');
const Project = require('./models/project');

const dburl = process.env.DB_URL;
mongoose.connect(dburl,{
    useNewUrlParser:true,
    useUnifiedTopology:true,
    useCreateIndex:true,
}); 
mongoose.set('useFindAndModify', false);
const db=mongoose.connection;
db.on("error",console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log("Database connected");
})
app.use(express.static(path.join(__dirname,'public')));
app.engine('ejs',ejsMate);

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));

const sessionConfig = {
    name: 'qwerty',
    secret:"djsdjjhj",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly:true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7 
    }
}
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use('manager',new LocalStrategy(Manager.authenticate()));
passport.use('employee',new LocalStrategy(Employee.authenticate()));
passport.serializeUser(function(user,done){
    done(null,user);
});
passport.deserializeUser(function(user,done){
    if(user!=null){
        done(null,user);
    }
    
});

app.use((req,res,next) => {
    res.locals.signedUser = req.user;
    next();
})

app.use((req,res,next)=>{
    res.locals.success=req.flash('success');
    res.locals.error=req.flash('error');
    next();
})

const isLoggedIn = (req,res,next) => {
    if(!req.isAuthenticated()){
        return res.redirect('/');
    }
    next();
}

app.get('/',(req,res)=>{
    res.render("home");
})
app.get('/manager/register',(req,res)=>{
    res.render("manager/register");
})
app.post('/manager/register',wrapasync(async (req,res)=>{
    try{
        const {name,username,password} = req.body;
        const newM = new Manager({name,username});
        await Manager.register(newM,password);
        req.flash('Registered Successfully! Now Please Login');
        res.redirect(`/manager/login`);
    }catch(e){
        req.flash('error',e.message);
        res.redirect('/manager/register');
    }
}))
app.get('/manager/login',(req,res)=>{
    res.render("manager/login");
})
app.post('/manager/login',passport.authenticate('manager',{failureRedirect:'/manager/login',failureFlash:true},),wrapasync(async (req,res)=>{
    const {username} = req.body;
    const manager = await Manager.findOne({username});
    res.redirect(`/manager/${manager._id}`);
}))
app.get('/manager/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
})
app.get('/manager/:id/project',isLoggedIn,wrapasync(async (req,res)=>{
    const {id} = req.params;
    const manager = await Manager.findById(id).populate('employees');
    console.log(id);
    res.render("manager/project",{manager});
}))


app.get('/manager/:id',isLoggedIn,wrapasync(async (req,res)=>{
    const {id} = req.params;
    const manager = await Manager.findById(id).populate({
        path:'projects',
        populate:{
            path:'employees'
        }
    });
    // res.json(manager.employees);
    res.render('manager/index',{manager});
}))
app.post('/manager/:id/project',isLoggedIn,wrapasync(async (req,res)=>{
    const {title}=req.body;
    const {id} = req.params;
    const manager = await Manager.findById(id).populate({
        path:'projects',
        populate:{
            path:'employees'
        }
    });
    const project = new Project({title:title});
    manager.projects.push(project);
    await project.save();
    await manager.save();
    req.flash('success','Project Added Successfully');
    res.redirect(`/manager/${id}`);
}))
app.put('/manager/:mid/project/:id',isLoggedIn,wrapasync(async (req,res)=>{
    const {id,mid}=req.params;
    const {username}=req.body;
    const project = await Project.findById(id);
    try{
        const employee=await Employee.findOne({username:username});
        for(let proj of employee.projects){
            if(project.title==proj.title){
                req.flash('error','Employee with entered username already exist in the Project');
                return res.redirect(`/manager/${mid}`);
            }
        }
        project.employees.push(employee);
        employee.projects.push({title:project.title});
        // console.log(employee.projects[0].title);
        await project.save();
        await employee.save();
        // res.send(project);
        req.flash('success','Employee Added Successfully In the Project');
        res.redirect(`/manager/${mid}`);
    }
    catch(e){
        req.flash('error','Employee with entered username does not Exist');
        return res.redirect(`/manager/${mid}`);
    };
}))
//render task
app.get('/manager/:mid/project/:pid/employee/:id',isLoggedIn,wrapasync(async (req,res)=>{
    // const {id} = req.params;
    // const employee = await Employee.findById(id);
    // const {todo} = req.body;
    // if(todo!="")
    //     employee.tasks.push(todo);
    // await employee.save();
    // const username = "enr";
    // const manager = await Manager.findOne({username});
    // req.flash('success','Task Added Successfully');
    // res.redirect(`/manager/${manager._id}`);
    // res.send("Ok");
    const {id,pid,mid} = req.params;
    const employee = await Employee.findById(id);
    const project = await Project.findById(pid);
    const manager = await Manager.findById(mid);
    let pr;
    for(let proj of employee.projects){
        if(project.title==proj.title){
            pr=proj;
        }
    }
    res.render('manager/assignTask',{project,employee,myproject:pr,manager});
}))
//Add Task
app.put('/manager/:mid/project/:pid/employee/:id',isLoggedIn,wrapasync(async (req,res)=>{
    const {id,pid,mid} = req.params;
    const {todo} = req.body;
    const employee = await Employee.findById(id);
    const project = await Project.findById(pid);
    let idx=-1;
    for(let i=0;i<employee.projects.length;i++){
        if(project.title==employee.projects[i].title){
            idx=i;
            break;
        }
    }
    console.log(idx);
    if(todo!=""){
        employee.projects[idx].tasks.push({name:todo,iteration:1,chk:0});
    }
    await employee.save();
    req.flash('success','Task Added Successfully');
    res.redirect(`/manager/${mid}/project/${pid}/employee/${id}`);
}))
//Reassign Task
app.put('/manager/:mid/project/:pid/employee/:id/:task',isLoggedIn,wrapasync(async (req,res)=>{
    const {id,pid,mid,task} = req.params;
    const employee = await Employee.findById(id);
    const project = await Project.findById(pid);
    console.log("bef");
    for(let i=0;i<employee.projects.length;i++){
        if(project.title==employee.projects[i].title){
            for(let j=0;j<employee.projects[i].tasks.length;j++){
                if(employee.projects[i].tasks[j].name==task){
                    console.log(employee.projects[i].tasks[j].name);
                    employee.projects[i].tasks[j].chk=0;
                    employee.projects[i].tasks[j].iteration+=1;
                    break;
                }
            }
            break;
        }
    }
    // req.flash('success','Task Reassigned Successfully');
    await employee.save();
    
    // console.log("after");
    req.flash('success','Task Reassigned Successfully');
    // console.log("flasj");
    res.redirect(`/manager/${mid}/project/${pid}/employee/${id}`);

}))
app.get('/employee/register',(req,res)=>{
    res.render("employee/register");
})
app.post('/employee/register',wrapasync(async (req,res)=>{
    try{
        const {name,username,password} = req.body;
        const newE = new Employee({name,username});
        await Employee.register(newE,password);
        await newE.save();
        req.flash('Registered Successfully! Now Please Login');
        res.redirect('/employee/login');
    }catch(e){
        req.flash('error',e.message);
        res.redirect('/employee/register');
    }
}))
app.get('/employee/login',(req,res)=>{
    res.render('employee/login');
})
app.post('/employee/login',passport.authenticate('employee',{failureRedirect:'/employee/login',failureFlash:true}),wrapasync(async (req,res)=>{
    // console.log(req.user);
    const {username} = req.body;
    const employee = await Employee.findOne({username});
    // res.send(employee);
    res.redirect(`/employee/${employee._id}`);

}))
app.get('/employee/logout',(req,res)=>{
    req.logout();
    res.redirect('/');
})
app.get('/employee/:id',isLoggedIn,wrapasync(async (req,res)=>{
    const {id} = req.params;
    const employee = await Employee.findById(id);
    res.render('employee/index',{employee});
}))
//submit task for review
app.put('/project/:title/employee/:id/:task',isLoggedIn,wrapasync(async (req,res)=>{
    const {id,title,task} = req.params;
    const employee = await Employee.findById(id);
    // let idx=-1;
    // console.log(task);
    // console.log(employee);
    for(let i=0;i<employee.projects.length;i++){
        if(title==employee.projects[i].title){
            for(let j=0;j<employee.projects[i].tasks.length;j++){
                if(employee.projects[i].tasks[j].name==task){
                    console.log(employee.projects[i].tasks[j].name);
                    employee.projects[i].tasks[j].chk=1;
                    break;
                }
            }
            break;
        }
    }
    await employee.save();
    req.flash('success','Submitted For Review');
    res.redirect(`/employee/${id}`);
}))
//Delete Project
app.delete('/manager/:mid/project/:pid',isLoggedIn,wrapasync(async (req,res)=>{
    const {pid,mid}=req.params;
    const project = await Project.findById(pid).populate('employees');
    for(let i=0;i<project.employees.length;i++){
        console.log(project.employees[i]._id);
        const employee=await Employee.findById(project.employees[i]._id);
        console.log(employee);
        for(let j=0;j<employee.projects.length;j++){
            if(employee.projects[j].title===project.title){
                console.log(employee.projects[j].title);
                employee.projects.splice(j,1);
                await employee.save()
                break;
            }
        }
    }
    await Project.findByIdAndDelete(pid);

    req.flash('success','Project Deleted Successfully');
    res.redirect(`/manager/${mid}`)
}))
//Delete Employee from project
app.delete('/manager/:mid/project/:pid/employee/:id',isLoggedIn,wrapasync(async (req,res)=>{
    const {id,pid,mid}=req.params;
    const employee = await Employee.findById(id);
    const project = await Project.findById(pid);
    for(let j=0;j<employee.projects.length;j++){
        if(employee.projects[j].title===project.title){
            console.log(employee.projects[j].title);
            employee.projects.splice(j,1);
            await employee.save()
            break;
        }
    }
    await Project.findByIdAndUpdate(pid,{$pull:{employees:id}});
    req.flash('success','Successfully removed the employee');
    res.redirect(`/manager/${mid}`);
}))

//Delete Task
app.delete('/manager/:mid/project/:pid/employee/:id/:task',isLoggedIn,wrapasync(async (req,res)=>{
    const {id,pid,mid,task} = req.params;
    const employee = await Employee.findById(id);
    const project = await Project.findById(pid);
    let idxi=-1;
    let idxj=-1;
    for(let i=0;i<employee.projects.length;i++){
        if(project.title==employee.projects[i].title){
            for(let j=0;j<employee.projects[i].tasks.length;j++){
                if(employee.projects[i].tasks[j].name==task){
                    console.log(employee.projects[i].tasks[j].name);
                    idxi=i;
                    idxj=j;
                    break;
                }
            }
            break;
        }
    }
    await project.save();
    if(idxi!=-1){
        employee.projects[idxi].tasks.splice(idxj,1);
    }
    await employee.save();
    req.flash('success','Task Deleted Successfully');
    res.redirect(`/manager/${mid}/project/${pid}/employee/${id}`);
}))



app.all('*',(req,res,next)=>{
    next(new AppError(404,"Page Not Found"));
})

app.use((err,req,res,next)=>{
    const {status=500}=err;
    if(!err.message)
    {
        err.message="Something Went Wrong";
    }
    res.render('error',{err});
})

app.listen(3000,()=>{
    console.log("On port 3000");
})