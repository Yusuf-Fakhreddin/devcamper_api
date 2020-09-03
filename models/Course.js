const mongoose = require('mongoose');
const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    required: [true, 'Please add a course title'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
  },
  weeks: {
    type: String,
    required: [true, 'Please add a number of weeks'],
  },
  tuition: {
    type: Number,
    required: [true, 'Please add a tuition cost'],
  },
  minimumSkill: {
    type: String,
    required: [true, 'Please add a minimum skill'],
    // enum means the value has to be one of these
    enum: ['beginner', 'intermediate', 'advanced'],
  },
  scholarshipAvailable: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // reference to a bootcamp
  // courses are related to bootcamps
  bootcamp: {
    type: mongoose.Schema.ObjectId,
    ref: 'Bootcamp',
    required: true,
  },
  // reference to a user
  // bootcamps are related to users
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
});

// Static method on schemas to get avg of bootcamp courses tuitions
CourseSchema.statics.getAverageCost = async function (bootcampId) {
  // mongoose function
  const obj = await this.aggregate([
    {
      // get the courses with bootcamp field equal to the passed bootcampId parameter
      $match: { bootcamp: bootcampId },
    },
    {
      // the object we want to create (calculated obj)
      $group: {
        _id: '$bootcamp',
        // using avg operator on the field we want to get the average of all instances with the bootcamp field = bootcampId
        averageCost: { $avg: '$tuition' },
      },
    },
  ]);

  try {
    // saving the calculaed value into the data base
    await this.model('Bootcamp').findByIdAndUpdate(bootcampId, {
      averageCost: Math.ceil(obj[0].averageCost / 10) * 10,
    });
  } catch (error) {
    console.error(error);
  }
};

// call getAverageCost after saving an instance
CourseSchema.post('save', function () {
  // Static methods run on the actual model
  this.constructor.getAverageCost(this.bootcampId);
  // this here refers to the created obj (instance)
});

// Call getAverageCost before removing an instance
CourseSchema.pre('remove', function () {
  this.constructor.getAverageCost(this.bootcampId);
});
module.exports = mongoose.model('Course', CourseSchema);
