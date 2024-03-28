const mongoose = require("mongoose");
const { Client } = require("@elastic/elasticsearch");
const Note = require("../models/note");
const Team = require("../models/team");
const About = require("../models/about");
const Topic = require("../models/topic");

const esClient = new Client({
  node: "https://ab24abf3e2874367921a56ecd22ea2f9.us-central1.gcp.cloud.es.io:443",
  auth: {
    apiKey: {
      id: "DWCpYY4BbGoGyYtIMll2", // Replace with your actual API key ID
      api_key: "dScJ7yw3Qvij0WYDJ829Mw", // Replace with your actual API key secret
    },
  },
});

module.exports.transferDataToElasticSearch = async (req, res) => {
  try {
    await esClient.indices.create(
      {
        index: "kbase",
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
              aboutName: {
                type: "text",
                fields: {
                  suggest: {
                    type: "completion",
                  },
                },
              },
              aboutDescription: {
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
      { ignore: 400 }
    );

    const notes = await Note.find().lean();
    for (const note of notes) {
      const jsonString = JSON.stringify(note._id);
      const encodedid = Buffer.from(jsonString).toString("base64");
      const cleanDescription = note.description.replace(/<[^>]+>/g, '');
      await esClient.index({
        index: "kbase",
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
        index: "kbase",
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
        index: "kbase",
        body: {
          teamName: team.teamName,
          teamDescription: team.description,
        },
      });
    }

    const abouts = await About.find().lean();
    for (const about of abouts) {
      const cleanDescription = about.description.replace(/<[^>]+>/g, '');
      await esClient.index({
        index: "kbase",
        body: {
          aboutName: about.aboutName,
          aboutDescription: cleanDescription,
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
      index: "kbase",
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
                wildcard: { aboutDescription: `${query}*` },
              },
              {
                wildcard: { aboutName: `${query}*` },
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
      aboutName: hit._source.aboutName,
      topicName: hit._source.topicName,
      children: hit._source.children,
      topicId: hit._source.topicId,
      aboutDescription: hit._source.aboutDescription,
    }));

    res.json(hits);
  } catch (error) {
    res.status(500).json(error);
  }
};
