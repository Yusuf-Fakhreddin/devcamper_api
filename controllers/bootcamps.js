const ErrorResponse = require('../utils/errorResponse');
const Bootcamp = require('../models/Bootcamp');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const path = require('path');
//@desc  get all bootcamps
//@route  GET /api/v1/bootcamps
//@access  public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  // using advacnedResults middleware to add filtering, pagination, selection ..etc
  res.status(200).json(res.advancedResults);
});

//@desc  get single bootcamp
//@route  GET /api/v1/bootcamps/:id
//@access  public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  // did not find a result with that id that's correctly formatted
  if (!bootcamp) {
    // create an obj of the ErrorResponse class then send it to the errorHandling middleware
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  }
  res.status(200).json({
    success: true,
    data: bootcamp,
  });
});

//@desc  create new bootcamp
//@route  POST /api/v1/bootcamps
//@access  private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
  // add the logged in user to req.body so it's added to the bootcamp
  req.body.user = req.user.id;

  // Checl for published bootcamp by the user
  const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

  // if the user is not an admin, they can only add one bootcamp
  if (publishedBootcamp && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `The user with ID ${req.user.id} has already published a bootcamp`,
        400
      )
    );
  }

  const bootcamp = await Bootcamp.create(req.body);
  res.status(201).json({
    success: true,
    data: bootcamp,
  });
});

//@desc  update bootcamp
//@route  PUT /api/v1/bootcamps/:id
//@access  private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  let bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp)
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );

  // make sure user is bootcamp owner or the admin
  // id comes from database as objectId
  // id comes from request as string
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this bootcamp`,
        404
      )
    );
  }

  // update only after checking the user is allowed to update the bootcamp
  bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, data: bootcamp });
});

//@desc  delete bootcamp
//@route  DELETE /api/v1/bootcamps/:id
//@access  private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);

  if (!bootcamp)
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  // make sure user is bootcamp owner or the admin
  // id comes from database as objectId
  // id comes from request as string
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this bootcamp`,
        404
      )
    );
  }
  bootcamp.remove();
  res.status(200).json({ success: true, data: {} });
});

//@desc  Get bootcamps within a radius
//@route  GET /api/v1/bootcamps/radius/:zipcode/:distance
//@access  public
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
  const { zipcode, distance } = req.params;
  //Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;
  // cal radius using radians
  // divide distance by radius of earth = 3,963 mi / 6,378km
  const radius = distance / 3963;
  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });
  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps,
  });
});

//@desc   upload photo for bootcamp
//@route  PUT /api/v1/bootcamps/:id/photo
//@access  private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next) => {
  console.log(req);
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp)
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  // make sure user is bootcamp owner or the admin
  // id comes from database as objectId
  // id comes from request as string
  if (bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this bootcamp`,
        404
      )
    );
  }
  if (!req.files) return next(new ErrorResponse('Please upload a file', 400));

  const file = req.files.file;

  // make sure the image is a photo
  if (!file.mimetype.startWith('image')) {
    return next(new ErrorResponse('Please upload an image file', 400));
  }

  // check file size
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD} `,
        404
      )
    );
  }

  // Create custom filename
  // ${path.parse(file.name).ext} to add the file extension
  file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    // insert filename into the database to be able to serve it
    await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });

    res.status(200).json({
      success: true,
      data: file.name,
    });
  });
});
