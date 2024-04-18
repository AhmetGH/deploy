const mongoose = require("mongoose");
const { Client } = require("@elastic/elasticsearch");

const connection =
  "mongodb+srv://ahmetgocmen07:Cfk9tY27nvBaFzxS@ahmet.shuruci.mongodb.net/?retryWrites=true&w=majority&appName=ahmet";

const esClient = new Client({
  node: "https://81616184282a4884ba21eafda374e4e6.us-central1.gcp.cloud.es.io:443",
  auth: {
    apiKey: {
      id: "e1_R5o4Boz2ZTsefV80R", // Replace with your actual API key ID
      api_key: "bll7W4oxQfSRzDyrrKVATA", // Replace with your actual API key secret
    },
  },
});

mongoose
  .connect(connection)
  .then(async () => {
    console.log("MongoDB connected successfully");

    const db = mongoose.connection.db;

    const notesCollection = db.collection("notes");
    const teamsCollection = db.collection("teams");
    const topicsCollection = db.collection("topics");

    // MongoDB Change Stream'lerini başlatma
    const notesChangeStream = notesCollection.watch();
    const teamsChangeStream = teamsCollection.watch();
    const topicsChangeStream = topicsCollection.watch();

    // Her koleksiyon için değişiklik dinleme
    notesChangeStream.on("change", async (change) => {
      console.log("Note change detected:", change);
      await syncNoteToElasticsearch(change);
    });

    teamsChangeStream.on("change", async (change) => {
      console.log("Team change detected:", change);
      await syncTeamToElasticsearch(change);
    });

    topicsChangeStream.on("change", async (change) => {
      console.log("Topic change detected:", change);
      await syncTopicToElasticsearch(change);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

async function syncTeamToElasticsearch(change) {
  const { operationType, fullDocument, documentKey, updateDescription } =
    change;

  try {
    if (operationType === "insert") {
      console.log("fullDocument:", fullDocument);

      // Takım belgesini Elasticsearch'e ekle veya güncelle
      await esClient.index({
        index: "kbase1",
        id: documentKey._id.toHexString(), // ObjectId'i string'e dönüştür
        body: {
          teamName: fullDocument.teamName,
          teamDescription: fullDocument.teamDescription,
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      console.log("günc açıklama", updateDescription);
      // Takım belgesini güncelle
      const updatedFields = updateDescription.updatedFields;

      // Güncellenen alanları al
      const { teamName, teamDescription } = updatedFields;

      // Elasticsearch'e güncelleme işlemini gönder
      await esClient.update({
        index: "kbase1",
        id: documentKey._id.toHexString(), // ObjectId'i string'e dönüştür
        body: {
          doc: {
            ...(teamName && { teamName }), // Eğer teamName değiştiyse güncelle
            ...(teamDescription && { teamDescription }), // Eğer teamDescription değiştiyse güncelle
          },
        },
      });
    } else if (operationType === "delete") {
      // Takım belgesini Elasticsearch'ten sil
      await esClient.delete({
        index: "kbase1",
        id: documentKey._id.toHexString(), // ObjectId'i string'e dönüştür
      });
    }
  } catch (error) {
    console.error("Error syncing team to Elasticsearch:", error);
  }
}

async function syncNoteToElasticsearch(change) {
  const { operationType, fullDocument, documentKey, updateDescription } =
    change;

  try {
    if (operationType === "insert") {
      console.log("fullDocumentNotes:", fullDocument);
      const cleanDescription = fullDocument.description?.replace(
        /<[^>]+>/g,
        ""
      );
      const jsonString = JSON.stringify(fullDocument._id);

      const encodedid = Buffer.from(jsonString).toString("base64");

      await esClient.index({
        index: "kbase1",
        id: documentKey._id.toHexString(),
        body: {
          noteName: fullDocument.noteName,
          noteDescription: cleanDescription,
          noteId: encodedid,
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      // Not belgesini güncelle
      const updatedFields = updateDescription.updatedFields;
      const { noteName, description } = updatedFields;

      const cleanDescription = description?.replace(/<[^>]+>/g, "");

      // Elasticsearch'e güncelleme işlemini gönder
      await esClient.update({
        index: "kbase1",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(noteName && { noteName }),
            ...(description && { noteDescription: cleanDescription }),
          },
        },
      });
    } else if (operationType === "delete") {
      // Not belgesini Elasticsearch'ten sil
      await esClient.delete({
        index: "kbase1",
        id: documentKey._id.toHexString(),
      });
    }
  } catch (error) {
    console.error("Error syncing note to Elasticsearch:", error);
  }
}

async function syncTopicToElasticsearch(change) {
  const { operationType, fullDocument, documentKey, updateDescription } =
    change;

  try {
    if (operationType === "insert") {
      const jsonString = JSON.stringify(fullDocument._id);
      const encodedid = Buffer.from(jsonString).toString("base64");

      await esClient.index({
        index: "kbase1",
        id: documentKey._id.toHexString(),
        body: {
          topicName: fullDocument.topicName,
          children: [],
          topicId: encodedid,
        },
      });
    } else if (
      operationType === "update" &&
      updateDescription &&
      updateDescription.updatedFields
    ) {
      const updatedFields = updateDescription.updatedFields;

      let { topicName } = updatedFields;

      await esClient.update({
        index: "kbase1",
        id: documentKey._id.toHexString(),
        body: {
          doc: {
            ...(topicName && { topicName }),
          },
        },
      });
    } else if (operationType === "delete") {
      await esClient.delete({
        index: "kbase1",
        id: documentKey._id.toHexString(),
      });
    }
  } catch (error) {
    console.error("Error syncing topic to Elasticsearch:", error);
  }
}

module.exports = mongoose;
