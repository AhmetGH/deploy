const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { Client } = require("@elastic/elasticsearch");

// Elasticsearch istemcisini oluşturma
const esClient = new Client({ node: "http://localhost:9200" });

// MongoDB schema ve model
const Note = require("../models/note");
const Team = require("../models/team");
const About = require("../models/about");

// Middleware'ler
router.use(express.json());

router.post("/transferData", async (req, res) => {
  try {
    // Elasticsearch indeksini oluştur
    await esClient.indices.create(
      {
        index: "data",
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
            },
          },
        },
      },
      { ignore: 400 }
    );

    // MongoDB'den not verilerini al ve Elasticsearch'e aktar
    const notes = await Note.find().lean();
    for (const note of notes) {
      // members dizisini kullanarak fullname'ları birleştir

      const jsonString = JSON.stringify(note._id);
      const encodedid = btoa(jsonString).toString("base64");

      await esClient.index({
        index: "data",
        body: {
          noteName: note.noteName,
          noteDescription: note.description,
          noteId: encodedid,
        },
      });
    }

    // MongoDB'den takım verilerini al ve Elasticsearch'e aktar
    const teams = await Team.find().lean();
    for (const team of teams) {
      await esClient.index({
        index: "data",
        body: {
          teamName: team.teamName,
          teamDescription: team.description,
        },
      });
    }

    const abouts = await About.find().lean();
    for (const about of abouts) {
      await esClient.index({
        index: "data",
        body: {
          aboutName: about.aboutName,
          aboutDescription: about.description,
        },
      });
    }

    console.log("Data transferred from MongoDB to Elasticsearch successfully.");
    res.send("Data transferred from MongoDB to Elasticsearch successfully.");
  } catch (error) {
    console.error("Error transferring data:", error);
    res.status(500).send("Error transferring data.");
  }
});

router.get("/autocomplete", async (req, res) => {
  try {
    const { query } = req.query;

    // Elasticsearch sorgusu oluştur
    const result = await esClient.search({
      index: "data",
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
            ],
          },
        },
      },
    });

    // Elasticsearch'ten gelen sonuçları işle ve yanıtla
    const hits = result.hits.hits.map((hit) => ({
      teamName: hit._source.teamName,
      noteName: hit._source.noteName,
      noteId: hit._source.noteId,
      teamDescription: hit._source.teamDescription,
      noteDescription: hit._source.noteDescription,
      aboutName: hit._source.aboutName,
      aboutDescription: hit._source.aboutDescription,
    }));

    console.log("hits:", hits);
    res.json(hits);
  } catch (error) {
    console.error("Error fetching autocomplete data:", error);
    res.status(500).send("Error fetching autocomplete data.");
  }
});

module.exports = router;
