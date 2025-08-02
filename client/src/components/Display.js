import { useState } from "react";
import "./Display.css";
import JSEncrypt from 'jsencrypt';

const Display = ({ contract, account, privateKey }) => {
  const [data, setData] = useState([]);

  const getData = async () => {
    let dataArray;
    const OtherAddress = document.querySelector(".address").value;
    try {
      if (OtherAddress) {
        dataArray = await contract.display(OtherAddress);
        console.log(`Fetching files for address: ${OtherAddress}`);
      } else {
        dataArray = await contract.display(account);
        console.log(`Fetching files for own address: ${account}`);
      }
    } catch (e) {
      alert("You don't have access");
      console.error("Access error:", e);
      return;
    }
    
    if (dataArray.length > 0) {
      const files = await Promise.all(dataArray.map(async (item, index) => {
        // Sender's view (when viewing own files)
        if (!OtherAddress && item.plainUrl && item.plainUrl.startsWith("https://gateway.pinata.cloud/ipfs/")) {
          const cid = item.plainUrl.split("/").pop();
          console.log(`Sender view - Plain IPFS Hash: ${cid}`);
          return {
            srNo: index + 1,
            fileName: cid,
            fileUrl: item.plainUrl
          };
        } 
        // Recipient's view (when viewing someone else's files)
        else if (OtherAddress && privateKey && item.encryptedHash) {
          console.log(`Attempting decryption for item ${index + 1}`);
          console.log(`Encrypted IPFS Hash from blockchain: ${item.encryptedHash}`);
          
          const crypt = new JSEncrypt();
          crypt.setPrivateKey(privateKey);
          const decryptedHash = crypt.decrypt(item.encryptedHash);
          
          if (decryptedHash) {
            console.log(`Decrypted IPFS Hash: ${decryptedHash}`);
            return {
              srNo: index + 1,
              fileName: `File_${index + 1}`,
              fileUrl: `https://gateway.pinata.cloud/ipfs/${decryptedHash}`
            };
          } else {
            console.log("Decryption failed: Invalid private key or corrupted data");
            return null;
          }
        }
        console.log("Failed to process item:", item);
        return null;
      }));
      
      const validFiles = files.filter(file => file !== null);
      if (validFiles.length > 0) {
        setData(validFiles);
        console.log("Files successfully loaded:", validFiles);
      } else {
        alert("No accessible files to display");
        console.log("No valid files found after processing");
      }
    } else {
      alert("No files to display");
      console.log("No files returned from contract");
    }
  };

  return (
    <>
      <input type="text" placeholder="Enter Address" className="address" />
      <button className="center button" onClick={getData}>Get Data</button>
      <div className="table-container">
        <table className="file-table">
          <thead>
            <tr>
              <th>Sr. No</th>
              <th>File Name</th>
              <th>View File</th>
            </tr>
          </thead>
          <tbody>
            {data.map((file, index) => (
              <tr key={index}>
                <td>{file.srNo}</td>
                <td>{file.fileName}</td>
                <td>
                  <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                    View File
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default Display;