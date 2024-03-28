/**
 * @swagger
 * /team/{teamName}:
 *   get:
 *     summary: Get team members with pagination and filtering
 *     description: Returns a list of team members for the specified team with optional filtering and pagination.
 *     parameters:
 *       - in: path
 *         name: teamName
 *         description: The name of the team to retrieve members from
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: pageNumber
 *         description: The page number to retrieve
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: sortBy
 *         description: Field to sort by  - (members.fullname , members.age , members._id) , default sorting by members._id
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: order
 *         description: Sort order (asc or desc)
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
 *         description: A list of team members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRecords:
 *                   type: integer
 *                 filteredMembers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                       fullname:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       role:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                       age:
 *                         type: integer
 */

/**
 * @swagger
 * /team:
 *   get:
 *     summary: Get teams with pagination and search
 *     description: Retrieve a list of teams with pagination and search functionality.
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Optional. Search term to filter teams by teamName or description.
 *       - in: query
 *         name: pageNumber
 *         schema:
 *           type: integer
 *         description: Optional. The page number for pagination (default is 1).
 *     responses:
 *       '200':
 *         description: A list of teams with pagination information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRecords:
 *                   type: integer
 *                   description: The total number of teams matching the search criteria.
 *                 teams:
 *                   type: array
 *                   description: The list of teams for the current page.
 *                   items:
 *                     type: object
 *                     properties:
 *                       teamName:
 *                         type: string
 *                         description: The name of the team.
 *                       description:
 *                         type: string
 *                         description: The description of the team.
 *                       memberCount:
 *                         type: integer
 *                         description: The number of members in the team.
 *       '500':
 *         description: Internal server error.
 */

var express = require("express");
var router = express.Router();
var teamController = require("../controllers/teamController");

router.get("/:teamName", teamController.getTeamMatesWithPagination);

router.get("/", teamController.getTeams);

router.post("/", teamController.postTeam);

router.post("/:teamName/member", teamController.postTeamMember);

router.put("/:teamName/member/:id", teamController.putMember);

module.exports = router;
