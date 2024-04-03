var express = require("express");
var router = express.Router();
var adminController = require("../controllers/adminController")


/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get users
 *     description: Returns a list of users with optional filtering and pagination.
 *     parameters:
 *       - in: query
 *         name: pageNumber
 *         description: The page number to retrieve , default 1. page
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         description: Field to sort by (fullname , age , _id) , default sorting by _id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         description: Sort order (asc or desc) , default asc
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: searchTerm
 *         description: Search term for filtering by fullname 
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: roleName
 *         description: Role name for filtering
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: title
 *         description: Title for filtering
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of users
 */


router.get("/users" , adminController.getUsers)
router.delete("/users" , adminController.deleteUsers)
router.post("/users" , adminController.createUser)
router.put("/users/:key" , adminController.updateUser)


module.exports = router