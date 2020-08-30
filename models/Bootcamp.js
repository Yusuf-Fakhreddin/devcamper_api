const mongoose = require('mongoose');
const slugify = require('slugify');
const geocoder = require('../utils/geocoder');
const BootcampSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      unique: true,
      trim: true,
      maxlength: [50, 'Name can not be more than 50 characters'],
      // a slug is a URL friendly version of the name
      // to use in the frontend URL
      // Devcentral Bootcamp --> devcentral-bootcamp
      slug: String,
      description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [500, 'Descriptipn can not be more than 500 characters'],
      },
      website: {
        type: String,
        match: [
          /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
          'Please use a valid URL with HTTP or HTTPS',
        ],
      },
      phone: {
        type: String,
        maxlength: [20, 'Phone number can not be longer than 20 characters'],
      },
      email: {
        type: String,
        match: [
          /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
          ,
          'Please add a valid email',
        ],
      },
      address: {
        type: String,
        required: [true, 'Please add an address'],
      },
      location: {
        // GeoJSON Point
        type: {
          type: String,
          enum: [Number],
          required: true,
        },
        coordinates: {
          type: [Number],
          required: true,
          index: '2dsphere',
        },
        formattedAddres: String,
        street: String,
        city: String,
        state: String,
        zipcode: String,
        country: String,
      },
      careers: {
        //array of strings
        type: [String],
        required: true,
        enum: [
          'Web Development',
          'Mobile Development',
          'UI/UX',
          'Data Science',
          'Business',
          'Other',
        ],
      },
      averageRating: {
        type: Number,
        min: [1, 'Rating must be at least 1'],
        max: [10, 'Rating can not be more than 10'],
      },
      averageCost: Number,
      photo: {
        type: String,
        default: 'no-photo.jpg',
      },
      housing: {
        type: Boolean,
        default: false,
      },
      jobAssistance: {
        type: Boolean,
        default: false,
      },
      jobGuarantee: {
        type: Boolean,
        default: false,
      },
      acceptGi: {
        type: Boolean,
        default: false,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//--> Mongoose Middlewares <--

// Create bootcamp slug from the name
BootcampSchema.pre('save', function (next) {
  //assign to the slug property of the schema a slug form the name using slugify package
  this.slug = slugify(this.name, { lower: true });
  next();
});

//Geocode &create location field
BootcampSchema.pre('save', async function (next) {
  const loc = await geocoder.geocode(this.address);
  this.location = {
    type: 'Point',
    coordinates: [loc[0].longitude, loc[0].latitude],
    formattedAddres: loc[0].formattedAddres,
    street: loc[0].streetName,
    city: loc[0].city,
    state: loc[0].stateCode,
    zipcode: loc[0].zipcode,
    country: loc[0].countryCode,
  };
  // Do not save address in DB
  this.address = undefined;
  next();
});

// cascade delete courses when a bootcamp is deleted
// delete the courses of a deleted bootcamp
BootcampSchema.pre('remove', async function (next) {
  // we didn't have to require the Course model
  await this.model('Course').deleteMany({ bootcamp: this._id });
  next();
});

// Reverse populate with virtuals
BootcampSchema.virtual('courses', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'bootcamp',
  // to get array of items with that bootcamp
  justOne: false,
});

module.exports = mongoose.model('Bootcamp', BootcampSchema);
