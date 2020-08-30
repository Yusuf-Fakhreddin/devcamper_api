const ErrorResponse = require('../utils/errorResponse');
const Bootcamp = require('../models/Bootcamp');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const path = require('path');
//@desc  get all bootcamps
//@route  GET /api/v1/bootcamps
//@access  public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  let query;
  console.log(req.query);
  //copying req.query
  const reqQuery = { ...req.query };

  //fields to exclude from query to use it for filteration
  const removeFields = ['select', 'sort', 'page', 'limit'];
  //loop over removeFields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);
  console.log(reqQuery);
  // create query as a string
  let queryStr = JSON.stringify(reqQuery);
  console.log(queryStr);
  // adding $ before gt/e lt/e in to be known for mongoose
  // as using the URL in frontend without the $
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );
  // filtering based on field values
  query = Bootcamp.find(JSON.parse(queryStr)).populate('courses');

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }
  // Sort
  if (req.query.sort) {
    // sort ascending by the query
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    // Descendeing by created at
    // the - for descending
    query = query.sort('-createdAt');
  }

  //pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Bootcamp.countDocuments();
  query = query.skip(startIndex).limit(limit);
  // Executing query
  const bootcamps = await query;

  // Pagination result to make it easier in frontend
  const pagination = {};
  // if there're more pages of data send the next page
  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit: limit,
    };
  }
  // if we 're past page 1 and there are previous pages send the previous one
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit: limit,
    };
  }
  res.status(200).json({
    success: true,
    data: bootcamps,
    pagination,
    count: bootcamps.length,
  });
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
  const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    // to get the updated data
    new: true,
    runValidators: true,
  });
  if (!bootcamp)
    return next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
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
