const express = require('express');
const {
  getCourses,
  getCourse,
  addCourse,
  updateCourse,
  deleteCourse,
} = require('../controllers/courses');
const { update } = require('../models/Course');

// mergeParams: Preserve the req.params values from the parent router. If the parent and the child have conflicting param names, the child’s value take precedence.

// so we check in getCourses controller if we have the bootcampId param to get its courses only

const router = express.Router({ mergeParams: true });

router.route('/').get(getCourses).post(addCourse);
router.route('/:id').get(getCourse).put(updateCourse).delete(deleteCourse);

module.exports = router;
