import { useState } from "react";
import "./Modal.css";
import JSEncrypt from 'jsencrypt';
import axios from "axios";

const Modal = ({ setModalOpen, contract, account, privateKey }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [recipientAddress, setRecipientAddress] = useState("");

  const sharing = async () => {
    if (!file || !recipientAddress) {
      alert("Please select a file and enter recipient address");
      return;
    }

    try {
      // Upload file to Pinata
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

      const ipfsHash = resFile.data.IpfsHash;
      const fileUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
      console.log("Original IPFS Hash:", ipfsHash);

      // Get recipient's public key
      const recipientPublicKey = await contract.getPublicKey(recipientAddress);
      if (!recipientPublicKey || recipientPublicKey === "") {
        alert("Recipient hasn't generated their public key yet. They need to log in first.");
        return;
      }

      // Encrypt IPFS hash with recipient's RSA public key
      const crypt = new JSEncrypt();
      crypt.setPublicKey(recipientPublicKey);
      const encryptedHash = crypt.encrypt(ipfsHash);
      if (!encryptedHash) {
        throw new Error("RSA encryption of IPFS hash failed");
      }
      console.log("Encrypted IPFS Hash:", encryptedHash);

      // Store both in a single transaction
      const tx = await contract.add(account, fileUrl, encryptedHash, { gasLimit: 300000 });
      await tx.wait(); // Wait for confirmation
      await contract.allow(recipientAddress);
      
      alert("File shared successfully");
      setFile(null);
      setFileName("No file selected");
      setRecipientAddress("");
      setModalOpen(false);
    } catch (error) {
      console.error("Sharing error:", error);
      if (error.code === "ACTION_REJECTED") {
        alert("Transaction rejected by user");
      } else if (error.data) {
        console.error("Error data:", error.data);
        alert(`Transaction failed: ${error.data.message || "Unknown error"}`);
      } else {
        alert(`Error sharing file: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="title">Share with</div>
        <div className="body">
          <input
            type="text"
            className="address"
            placeholder="Enter Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
          />
          <div className="file-input-container">
            <label htmlFor="file-share" className="choose-file">
              Choose File
            </label>
            <input
              type="file"
              id="file-share"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <span className="file-name">{fileName}</span>
          </div>
        </div>
        <div className="footer">
          <button onClick={() => setModalOpen(false)} id="cancelBtn">
            Cancel
          </button>
          <button onClick={sharing}>Share</button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
