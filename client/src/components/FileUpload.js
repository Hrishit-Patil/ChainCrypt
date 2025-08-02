import { useState } from "react";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = ({ contract, account, provider }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file to upload");
      return;
    }

    try {
      console.log("Starting file upload to Pinata...");
      const formData = new FormData();
      formData.append("file", file);

      const resFile = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: formData,
        headers: {
          pinata_api_key: `Enter_Your_Key`, // Pinata API Key
          pinata_secret_api_key: `Enter_Your_Secret_Key`, // Pinata Secret API Key
          "Content-Type": "multipart/form-data",
        },
      });

      if (!resFile.data || !resFile.data.IpfsHash) {
        throw new Error("Pinata upload failed: No IPFS hash returned");
      }

      const ipfsHash = resFile.data.IpfsHash;
      const fileUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      console.log("File uploaded successfully. IPFS Hash:", ipfsHash);

      console.log("Storing file URL on blockchain for account:", account);
      const tx = await contract.add(account, fileUrl, "", { gasLimit: 300000 });
      console.log("Transaction hash:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");

      alert("Successfully uploaded file to your personal storage");
      setFile(null);
      setFileName("No file selected");
    } catch (error) {
      console.error("Upload error:", error);
      if (error.response) {
        console.error("Pinata error response:", error.response.data);
        alert(`Failed to upload file to Pinata: ${error.response.data.error || "Unknown Pinata error"}`);
      } else if (error.code === "ACTION_REJECTED") {
        alert("Transaction rejected by user");
      } else if (error.data) {
        console.error("Blockchain error data:", error.data);
        alert(`Transaction failed: ${error.data.message || "Unknown blockchain error"}`);
      } else {
        alert(`Error uploading file: ${error.message || "Unknown error"}`);
      }
    }
  };

  const retrieveFile = (e) => {
    const data = e.target.files[0];
    if (data) {
      setFile(data);
      setFileName(data.name);
      e.target.value = null; // Reset input
    }
  };

  return (
    <div className="top">
      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="file-upload" className="choose">
          Choose File
        </label>
        <input
          type="file"
          id="file-upload"
          name="data"
          onChange={retrieveFile}
          style={{ display: "none" }}
        />
        <span className="textArea">File: {fileName}</span>
        <button type="submit" className="upload">
          Upload File
        </button>
      </form>
    </div>
  );
};

export default FileUpload;
