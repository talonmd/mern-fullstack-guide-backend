const HttpError = require("../models/http-error")

const { v4: uuidv4 } = require("uuid")
const { validationResult } = require("express-validator")
const getCoordsForAddress = require("../util/location")

const Place = require("../models/place")

let DUMMY_PLACES = [
  {
    id: "p1",
    title: "Empire State Building",
    description: "a famous place",
    location: {
      lat: 40.7484474,
      lng: -73.9871516,
    },
    address: "20 W",
    creator: "u1",
  },
]

// alternatives to function declaration
// function getPlaceById() { ... }
// const getPlaceById = function() { ... }

const getPlaceByPlaceId = async (req, res, next) => {
  const placeId = req.params.pid
  let place

  try {
    place = await Place.findById(placeId)
  } catch (err) {
    const error = new HttpError("Something went wrong, could not find a place", 500)
    return next(error)
  }

  if (!place) {
    const error = new HttpError("Could not find a place for the provided place id.", 404)
    return next(error)
  }

  res.json({ place: place.toObject({ getters: true }) })
}

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid
  let places
  try {
    places = await Place.find({ creator: userId })
  } catch (err) {
    const error = new HttpError("Fetching places failed, please try again later.", 500)
    return next(error)
  }

  if (!places || places.length === 0) {
    // this makes use of the middleware function in app.js for error handling
    // const error = new Error("Could not find a place for the provided user id.")
    // error.code = 404
    // you can throw error or call next and pass it an error
    // if you are in an async function you MUST call next rather than throw
    // return next(error)
    return next(new HttpError("Could not find the places for the provided user id.", 404))
    // the next above is returned, because that stops the rest of the code in the
    // function from executing (preventing it from sending two responses and breaking)
  }

  res.json({ places: places.map((place) => place.toObject({ getters: true })) })
}

const createPlace = async (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    //console.log(errors)
    return next(new HttpError("Invalid inputs passed, please check your data.", 422))
  }
  const { title, description, address, creator } = req.body

  let coordinates
  try {
    coordinates = await getCoordsForAddress(address)
  } catch (error) {
    return next(error)
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: "https://images.pexels.com/photos/63553/pexels-photo-63553.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=750&w=1260",
    creator,
  })

  //DUMMY_PLACES.push(createdPlace) // unshif(createdPlace) if you want to add it as the first element in the array

  try {
    await createdPlace.save()
  } catch (err) {
    const error = new HttpError("Creating place failed, please try again.", 500)
    return next(error)
  }

  res.status(201).json({ place: createdPlace })
}

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    //console.log(errors)
    throw new HttpError("Invalid inputs passed, please check your data.", 422)
  }

  const { title, description } = req.body
  const placeId = req.params.pid

  let place

  try {
    place = await Place.findById(placeId)
  } catch (err) {
    const error = new HttpError("Something went wrong, could not update place.", 500)
    return next(error)
  }

  place.title = title
  place.description = description

  try {
    await place.save()
  } catch (err) {
    const error = new HttpError("Something went wrong, could not update place.", 500)
    return next(error)
  }

  res.status(200).json({ place: place.toObject({ getters: true }) })
}

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid

  let place

  try {
    place = await Place.findById(placeId)
  } catch (err) {
    const error = new HttpError("Something went wrong, could not delete place.", 500)
    return next(error)
  }

  try {
    await place.remove()
  } catch (err) {
    const error = new HttpError("Something went wrong, could not delete place.", 500)
    return next(error)
  }

  // if (!DUMMY_PLACES.find((p) => p.id === placeId)) {
  //   throw new HttpError("Could not find a place to delete from that place ID.", 404)
  // }
  // // filter and find return a true or false, and keep the item based on which evaluated to true or not
  // // returns true if the places DO NOT match, therefore it keeps the place
  // // therefore, it returns false if the places DO match, therefore the place is dropped from the new array
  // DUMMY_PLACES = DUMMY_PLACES.filter((p) => p.id !== placeId)
  res.status(200).json({ message: "Deleted place." })
}

exports.getPlaceByPlaceId = getPlaceByPlaceId
exports.getPlacesByUserId = getPlacesByUserId
exports.createPlace = createPlace
exports.updatePlace = updatePlace
exports.deletePlace = deletePlace
