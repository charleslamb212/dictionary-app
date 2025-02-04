// create an instance of express routers
const express = require('express')
const db = require('../models')
const router = express.Router()
const crypto = require('crypto-js')
const bcrypt = require('bcrypt')

// mount our routes on the router

// GET /users/new -- serves a form to create a new user
router.get('/new', (req, res) => {
    res.render('users/new.ejs', {
        user: res.locals.user
    })
})

// POST /users -- creates a new user from the form @ /users/new
router.post('/', async (req, res) => {
    try {
        // based on the info in the req.body, find or create user
        const [newUser, created] = await db.user.findOrCreate({
            where: {
                email: req.body.email
            }
        }) 
        // if the user is found, redirect user to login
        if (!created) {
            console.log('user exists!')
            res.redirect('/users/login?message=Please log in to continue.')
        } else {
            // here we know its a new user
            // hash the supplied password
            const hashedPassword = bcrypt.hashSync(req.body.password, 12)
            // save the user with the new password
            newUser.password = hashedPassword
            await newUser.save() // actually save the new password in th db
            // ecrypt the new user's id and convert it to a string
            const encryptedId = crypto.AES.encrypt(String(newUser.id), process.env.SECRET)
            const encryptedIdString = encryptedId.toString()
            // place the encrypted id in a cookie
            res.cookie('userId', encryptedIdString)
            // redirect to user's profile
            res.redirect('/users/profile')
        }

    } catch (err) {
        console.log(err)
        res.status(500).send('server error2')
    }
})

// GET /users/login -- render a login form that POSTs to /users/login
router.get('/login', (req, res) => {
    res.render('users/login.ejs', {
        message: req.query.message ? req.query.message : null,
        user: res.locals.user
    })
})

// POST /users/login -- ingest data from form rendered @ GET /users/login
router.post('/login', async (req, res) => {
    try {
        // look up the user based on their email
        const user = await db.user.findOne({
            where: {
                email: req.body.email
            }
        })
        // boilerplate message if login fails
        const badCredentialMessage = 'username or password incorrect'
        if (!user) {
            // if the user isn't found in the db 
            res.redirect('/users/login?message=' + badCredentialMessage)
        } else if (!bcrypt.compareSync(req.body.password, user.password)) {
            // if the user's supplied password is incorrect
            res.redirect('/users/login?message=' + badCredentialMessage)
        } else {
            // if the user is found and their password matches log them in
            console.log('logging user in!')
            // ecrypt the new user's id and convert it to a string
            const encryptedId = crypto.AES.encrypt(String(user.id), process.env.SECRET)
            const encryptedIdString = encryptedId.toString()
            // place the encrypted id in a cookie
            res.cookie('userId', encryptedIdString)
            res.redirect('/users/profile')
        }
    } catch (err) {
        console.log(err)
        res.status(500).send('server error 1')
    }
})

// GET /users/logout -- clear any cookies and redirect to the homepage
router.get('/logout', (req, res) => {
    // log the user out by removing the cookie
    // make a get req to /
    res.clearCookie('userId')
    res.redirect('/')
})

// GET /users/profile -- show the user their profile page
router.get('/profile', (req, res) => {
    // if the user is not logged in -- they are not allowed to be here
    if (!res.locals.user) {
        res.redirect('/users/login?message=You must authenticate before you are authorized to view this resource!')
    } else {
        res.render('users/profile.ejs', {
            user: res.locals.user
        })
    }
})


// POST user favorites - CREATE receive the word and save it to the favorites database
// router.post('/favorites', async (req,res) => {
//     try {
//         await db.favorite.findOrCreate({
//             where: {
//                 word: req.body.word,
//                 definition: req.body.definition
//             }
//             // console.log(word)
//         })
//         res.redirect(req.get('referer'))
        
//     } catch (error) {
//         console.log(error)
//         res.status(500).send('server error🤯')
//     }
// })
// POST /users/:id/favorites - receive the name of a drink and add it to the database
router.post('/favorites', async (req, res) => {
    // TODO: Get form data and add a new record to DB
    try {
        if(req.cookies.userId){

      // create a new fave in the db
      await db.favorite.findOrCreate({
        where: {
          word: req.body.word,
          definition: req.body.definition,
          //userId: res.locals.user.id
        }

      })
      res.redirect('/users/favorites')
      // redirect to /faves to show the user their faves
    }else {res.redirect('/users/login')}
    } catch (err) {
      console.log(err)
      res.send(error)
    } 
    
})



// //GET user/favorites - READ render a page with favorite words
router.get('/favorites', async(req,res)=> {
    try {
        // function to find all favorite words
        const faveWords = await db.favorite.findAll({
            // where: {
            //     userId: res.locals.user.id
            // },
            include: [db.comment]
        })
        res.render('./users/favorites.ejs', {
            faveWords: faveWords
        })
    } catch (error) {
        console.log(error)
        res.status(500).send('server error😤')
    }
    
})

//DELETE user favorites
router.delete('/favorites/:id', async (req,res)=>{
    try {
        //remove word 
        const deleteFave = await db.favorite.destroy({
            where: {
                id:req.params.id
            },
        })
        res.redirect(req.get('referer'))
    } catch (error) {
        console.log(error.message);
        res.status(500).send('server error :(')
        
    }
})

router.post('/favorites/:id/comment', async (req,res)=>{
    try {
        // add comment via button
      const newComment = await db.comment.create({
        userId: req.cookies.name,
        comment: req.body.comment,
        favoriteId: req.params.id
      })
      //console.log(newComment)
      res.redirect('/users/favorites')
    } catch (err) {
      console.log(err)
    }
})  
//UPDATE USER ID

router.put('/:id', async (req,res)=>{
    try {
        const passwordChange = await db.user.update({
             password: bcrypt.hashSync(req.body.password, 12) }, 
             {where: {
                email:'req.body.email'
             }
         })              
    res.redirect('/')  
    } catch (error) {
        console.log(error)
        res.send(error)
    }
}) 
// export the router
module.exports = router