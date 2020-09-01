const advancedResults = (model, populate) => async (req, res, next) => {
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
  query = model.find(JSON.parse(queryStr));

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
  const total = await model.countDocuments();
  query = query.skip(startIndex).limit(limit);

  if (populate) {
    query = query.populate(populate);
  }
  // Executing query
  const results = await query;

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

  res.advancedResults = {
    success: true,
    count: results.length,
    pagination,
    data: results,
  };

  next();
};
