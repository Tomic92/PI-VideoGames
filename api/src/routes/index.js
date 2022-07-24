const { Router } = require('express');
// Importar todos los routers;
// Ejemplo: const authRouter = require('./auth.js');
const axios = require('axios');
const {Videogame, Genre, conn} = require('../db');
const e = require('cors');
// const { Sequelize } = require('sequelize');

const router = Router();
const {API_KEY} = process.env

/* // Configurar los routers
// Ejemplo: router.use('/auth', authRouter);

// GET https://api.rawg.io/api/games
// GET https://api.rawg.io/api/games?search={game}
// GET https://api.rawg.io/api/genres
// GET https://api.rawg.io/api/games/{id} */

// [ ] GET /videogames:
// Obtener un listado de los videojuegos
// Debe devolver solo los datos necesarios para la ruta principal, y
// [ ] GET /videogames?name="...":
// Obtener un listado de las primeros 15 videojuegos que contengan la palabra ingresada como query parameter
// Si no existe ningún videojuego mostrar un mensaje adecuado

const getGamesAPI = async () => {
  let juegos=[]
  for (let i = 1; i <= 5; i++) {
    let {results} = (await axios.get(`https://api.rawg.io/api/games?key=${API_KEY}&page=${i}`)).data
    juegos = [...juegos, ...results]
  }
  // const games = Promise.all(juegos)
  const data = juegos.map(e=>({
                          name: e.name,
                          id: e.id,
                          released: e.released,
                          rating: e.rating,
                          platforms: e.platforms.map(e=>e.platform.name),
                          image: e.background_image,
                          genres: e.genres.map(e=>e.name)
                        }))
  return data
}

const getGamesBd = async ()=>{
  return await Videogame.findAll({
    // through:{
        attributes:[
        "name",
        "id",
        "description",
        "released",
        "rating",
        "platforms",
        "image"]
      // }
      ,
      include:{
      model: Genre,
      attributes: ['name'],
    }
  })
}

const getAllVideogames = async ()=>{
  let apiInfo = await getGamesAPI()
  let dbInfo = await getGamesBd()
  return apiInfo.concat(dbInfo)
}

router.get('/videogames', async (req,res,next)=>{
  const game = req.query.name
  try {
    if(game){
      let games = []
      let gamesBd = await getGamesBd()
      gamesBd = gamesBd.filter(e=>e.name.toLowerCase().includes(game.toLowerCase()))

      if (gamesBd.length) games.push(gamesBd)

      let gamesApi = (await axios(`https://api.rawg.io/api/games?search=${game}&key=${API_KEY}`)).data.results
      gamesApi = gamesApi.map(e=>({
                    name: e.name,
                    id: e.id,
                    released: e.released,
                    rating: e.rating,
                    platforms: e.platforms.map(e=>e.platform.name),
                    image: e.background_image,
                    genres: e.genres.map(e=>e.name)
      }))
      if (gamesApi.length) games.push(gamesApi)

      return games.length ? 
      res.status(201).send(games.flat().slice(0,15)) :
      res.status(400).send("No se encuentra el videojuego")
    }else {
      let videogames = await getAllVideogames()
      return res.status(202).send(videogames)
    }
      
  } catch (error) {
    console.log(error)
  }
})

// [ ] GET /videogame/{idVideogame}:
// Obtener el detalle de un videojuego en particular
// Debe traer solo los datos pedidos en la ruta de detalle de videojuego
// Incluir los géneros asociados
/* name, id, description, released, rating, platforms */

router.get("/videogames/:id", async (req, res)=>{
  let {id} = req.params
  
  if(Number(id)) id = Number(id)

  try {
    if(typeof id === 'number'){

      let gameApi = (await axios(`https://api.rawg.io/api/games/${id}?key=${API_KEY}`)).data
      gameApi = {
                    name: gameApi.name,
                    id: gameApi.id,
                    description: gameApi.description,
                    released: gameApi.released,
                    rating: gameApi.rating,
                    platforms: gameApi.platforms.map(e=>e.platform.name),
                    image: gameApi.background_image,
                    genres: gameApi.genres.map(e=>e.name)
      }

      return gameApi ? 
      res.status(201).send(gameApi) :
      res.status(400).send("No se encuentra el videojuego")

    }else if(typeof id === 'string'){

      let gameBd = await getGamesBd()
      gameBd = gameBd.filter(e=>e.id.includes(id))

      return gameBd.length ? 
      res.status(202).send(gameBd) :
      res.status(401).send("No se encuentra el videojuego")

    }else{
      return res.status(402).send("No se encuentra el videojuego")
    }
  } catch (error) {
    console.log(error)
  } 
  /* 
  if(!foundAPI){
    let foundDB = Videogame.findOne({
      where:{
        id: id
      },
      include: Genre
    })

    // foundDB = JSON.stringify(foundDB);
    foundDB = JSON.parse(foundDB);
    return res.status(201).json(foundDB)
  }*/


})


// [ ] POST /videogames:
// Recibe los datos recolectados desde el formulario controlado de la ruta de creación de videojuego por body
// Crea un videojuego en la base de datos, relacionado a sus géneros.

router.post('/videogames', async (req,res,next) => {
  let { name, description, platforms } = req.body
  if (!name || !description || !platforms) {
    return res.status(401).send('Falta enviar datos obligatorios')
  }
  // res.status(201).send({ name, description, platforms })
    try {
    const newVideogame = await Videogame.create(req.body)
    res.status(201).send(newVideogame)
  } catch (error) {
    res.status(402).send('Error en alguno de los datos provistos')
  }
})

// [ ] GET /genres:
// Obtener todos los tipos de géneros de videojuegos posibles
// En una primera instancia deberán traerlos desde rawg y guardarlos en su propia base de datos y luego ya utilizarlos desde allí

async function getAllGenres(){
  try {
        let generos = (await axios(`https://api.rawg.io/api/genres?key=${API_KEY}`)).data.results.map(g=>({name: g.name,background_image: g.image_background}))
        await Genre.bulkCreate(generos)
        console.log("cargada la bd de generos");
      } catch (error) {
        console.log(error)
      }
}
getAllGenres()

router.get('/genres', (req,res,nex)=>{
    Genre.findAll()
    .then(e=>res.send(e))
    .catch(e=>console.log(e))
  })


module.exports = router;
