import Upload from "./artifacts/contracts/Upload.sol/Upload.json";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import "./App.css";
import JSEncrypt from 'jsencrypt';

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [privateKey, setPrivateKey] = useState(null);
  const [isKeyStored, setIsKeyStored] = useState(false);

  useEffect(() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    const loadProvider = async () => {
      if (provider) {
        window.ethereum.on("chainChanged", () => {
          window.location.reload();
        });

        window.ethereum.on("accountsChanged", () => {
          window.location.reload();
        });
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
        let contractAddress = "Your_Contract_Address"; // CONTRACT ADDRESS
        const contract = new ethers.Contract(
          contractAddress,
          Upload.abi,
          signer
        );
        setContract(contract);
        setProvider(provider);

        // Check if public key already exists
        const existingKey = await contract.getPublicKey(address);
        if (!existingKey || existingKey === "") {
          // Generate RSA keys
          const crypt = new JSEncrypt();
          crypt.getKey();
          const publicKey = crypt.getPublicKey();
          const privKey = crypt.getPrivateKey();
          setPrivateKey(privKey);
          
          // Store public key on blockchain with confirmation
          try {
            const tx = await contract.setPublicKey(publicKey);
            await tx.wait(); // Wait for transaction confirmation
            setIsKeyStored(true);
            console.log("Public key stored successfully");

            // Trigger private key download
            const blob = new Blob([privKey], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `${address}_private_key.pem`;
            link.click();
          } catch (error) {
            if (error.code === "ACTION_REJECTED") {
              alert("You need to approve the transaction to store your public key.");
            } else {
              console.error("Error storing public key:", error);
              alert("Failed to store public key. Check console for details.");
            }
          }
        } else {
          setIsKeyStored(true);
          console.log("Public key already stored");
        }
      } else {
        console.error("Metamask is not installed");
      }
    };
    provider && loadProvider();
  }, []);

  return (
    <>
      {!modalOpen && isKeyStored && (
        <button className="share" onClick={() => setModalOpen(true)}>
          Share
        </button>
      )}
      {modalOpen && (
        <Modal 
          setModalOpen={setModalOpen} 
          contract={contract}
          account={account}
          privateKey={privateKey}
        />
      )}

      <div className="App">
        <h1 style={{ color: "white" }}>ChainCrypt<span className="subtitle">File Sharing Application using Blockchain and RSA</span></h1>
        {!isKeyStored && (
          <p style={{ color: "red" }}>
            Please approve the transaction to set up your encryption keys
          </p>
        )}
        <div className="bg"></div>
        <div className="bg bg2"></div>
        <div className="bg bg3"></div>

        <p style={{ color: "white" }}>
          Account : {account ? account : "Not connected"}
        </p>
        <FileUpload
          account={account}
          provider={provider}
          contract={contract}
        ></FileUpload>
        <Display 
          contract={contract} 
          account={account}
          privateKey={privateKey}
        />
      </div>
    </>
  );
}

export default App;