const { Client } = require("@elastic/elasticsearch");
const Note = require("../models/note");
const Team = require("../models/team");
const About = require("../models/about");
const Topic = require("../models/topic");

const esClient = new Client({
  node: "https://81616184282a4884ba21eafda374e4e6.us-central1.gcp.cloud.es.io:443",
  auth: {
    apiKey: {
      id: "e1_R5o4Boz2ZTsefV80R", // Replace with your actual API key ID
      api_key: "bll7W4oxQfSRzDyrrKVATA", // Replace with your actual API key secret
    },
  },
});

module.exports.transferDataToElasticSearch = async (req, res) => {
  try {
    await esClient.indices.create(
      {
        index: "kbase1",
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
        index: "kbase1",
        id: note._id.toHexString(),
        body: {
          noteName: note.noteName,
          noteDescription: cleanDescription,
          noteId: encodedid,
        },
      });
    }

    const topics = await Topic.find().populate("children").lean();

    for (const topic of topics) {
      const childrenTopicNames = topic.children.map((child) => child.topicName);

      const jsonString = JSON.stringify(topic._id);
      const encodedid = Buffer.from(jsonString).toString("base64");

      await esClient.index({
        index: "kbase1",
        id: topic._id.toHexString(),
        body: {
          topicName: topic.topicName,
          children: childrenTopicNames,
          topicId: encodedid,
        },
      });
    }

    const teams = await Team.find().lean();
    for (const team of teams) {
      await esClient.index({
        index: "kbase1",
        id: team._id.toHexString(),
        body: {
          teamName: team.teamName,
          teamDescription: team.teamDescription,
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
    const { query } = req.query;

    const result = await esClient.search({
      index: "kbase1",
      body: {
        query: {
          bool: {
            should: [
              {
                wildcard: { noteName: `${query}*` },
              },
              {
                wildcard: { teamName: `${query}*` },
              },
              {
                wildcard: { teamDescription: `${query}*` },
              },
              {
                wildcard: { noteDescription: `${query}*` },
              },
              {
                wildcard: { topicName: `${query}*` },
              },
            ],
          },
        },
      },
    });

    const hits = result.hits.hits.map((hit) => ({
      teamName: hit._source.teamName,
      noteName: hit._source.noteName,
      noteId: hit._source.noteId,
      teamDescription: hit._source.teamDescription,
      noteDescription: hit._source.noteDescription,
      topicName: hit._source.topicName,
      children: hit._source.children,
      topicId: hit._source.topicId,
    }));

    res.json(hits);
  } catch (error) {
    res.status(500).json(error);
  }
};
