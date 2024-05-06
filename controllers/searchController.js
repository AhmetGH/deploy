const { Client } = require("@elastic/elasticsearch");
const Note = require("../models/note");
const Team = require("../models/team");
const Topic = require("../models/topic");
const userModel = require("../models/user");

const esClient = new Client({
  node: "https://6f91b4a351d143e59e1f34bbb8e2c557.europe-west3.gcp.cloud.es.io:443",
  auth: {
    apiKey: {
      id: "0ostL48BKT31eWBTT2iz", // Replace with your actual API key ID
      api_key: "48qJr4a7QHuPpPmS5sVqIA", // Replace with your actual API key secret
    },
  },
});

module.exports.transferDataToElasticSearch = async (req, res) => {
  try {
    await esClient.indices.create(
      {
        index: "bilgi",
        body: {
          mappings: {
            properties: {
              noteName: {
                type: "text",
                fields: {
                  suggest: {
                    type: "completion",
                  },
                },
              },
              noteDescription: {
                type: "text",
                fields: {
                  suggest: {
                    type: "completion",
                  },
                },
              },
              teamName: {
                type: "text",
                fields: {
                  suggest: {
                    type: "completion",
                  },
                },
              },
              teamDescription: {
                type: "text",
                fields: {
                  suggest: {
                    type: "completion",
                  },
                },
              },
              topicName: {
                type: "text",
                fields: {
                  suggest: {
                    type: "completion",
                  },
                },
              },
            },
          },
        },
      },
      { ignore: 500 }
    );

    const notes = await Note.find().lean();
    for (const note of notes) {
      const jsonString = JSON.stringify(note._id);
      const encodedid = Buffer.from(jsonString).toString("base64");
      const cleanDescription = note.description.replace(/<[^>]+>/g, "");
      await esClient.index({
        index: "bilgi",
        id: note._id.toHexString(),
        body: {
          noteName: note.noteName,
          noteDescription: cleanDescription,
          noteId: encodedid,
          noteAccessUser: note.accessUser.map((user) => user.toString()),
          noteAccessTeam: note.accessTeam.map((team) => team.toString()),
          members: note.members.map((user) => user.toString()),
        },
      });
    }

    const topics = await Topic.find().lean();
    for (const topic of topics) {
      const jsonString = JSON.stringify(topic._id);
      const encodedid = Buffer.from(jsonString).toString("base64");

      await esClient.index({
        index: "bilgi",
        id: topic._id.toHexString(),
        body: {
          topicName: topic.topicName,
          parentName: topic.parent,
          topicId: encodedid,
          owner: topic.owner.toString(),
          accessTeam: topic.accessTeam.map((team) => team.toString()),
          accessUser: topic.accessUser.map((user) => user.toString()),
        },
      });
    }

    const teams = await Team.find().lean();
    for (const team of teams) {
      await esClient.index({
        index: "bilgi",
        id: team._id.toHexString(),
        body: {
          teamName: team.teamName,
          teamDescription: team.teamDescription,
          teamMembers: team.members.map((member) => member.toString()),
        },
      });
    }

    res.send("Data transferred from MongoDB to Elasticsearch successfully.");
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports.searchSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;
    console.log("userId:", userId);

    const user = await userModel.findById(userId).populate("team"); // Populate the user's teams

    const userTeams = user.team.map((team) => team._id); // Extract team IDs

    const result = await esClient.search({
      index: "bilgi",
      body: {
        query: {
          bool: {
            must: {
              multi_match: {
                query: `${query}`,
                fields: [
                  "noteName",
                  "teamName",
                  "teamDescription",
                  "noteDescription",
                  "topicName",
                ],
                type: "phrase_prefix",
              },
            },
            should: [
              { term: { owner: userId } },
              { term: { accessUser: userId } },
              { terms: { accessTeam: userTeams } },
              { term: { noteAccessUser: userId } },
              { terms: { noteAccessTeam: userTeams } },
              { term: { members: userId } },
              { term: { teamMembers: userId } },

              // {
              //   multi_match: {
              //     query: `${query}`,
              //     fields: ["teamName", "teamDescription"],
              //     type: "phrase_prefix",
              //   },
              // }, // Include other fields in should
            ],
            minimum_should_match: 1,
          },
        },
        highlight: {
          fields: {
            teamName: {},
            teamDescription: {},
            noteName: {},
            noteDescription: {},
            topicName: {},
          },
        },
      },
    });

    const hits = result.hits.hits.map((hit) => {
      const highlights = hit.highlight || {};
      console.log("highlights:", highlights);
      return {
        teamName: highlights.teamDescription
          ? hit._source.teamName
          : highlights.teamName
          ? hit._source.teamName
          : undefined,
        teamDescription: highlights.teamDescription
          ? hit._source.teamDescription
          : undefined,
        noteName: highlights.noteDescription
          ? hit._source.noteName
          : highlights.noteName
          ? hit._source.noteName
          : undefined,
        noteDescription: highlights.noteDescription
          ? hit._source.noteDescription
          : undefined,
        topicName: highlights.topicName ? hit._source.topicName : undefined,
        parentName: hit._source.parentName,
        noteId: hit._source.noteId,
        topicId: hit._source.topicId,
      };
    });

    res.json(hits);
  } catch (error) {
    console.error("Search suggestion error:", error);
    res.status(500).json(error);
  }
};
