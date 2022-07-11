const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const { storeImages, storeTokenURIMetadata } = require("../utils/uploadToPinata")

const imagesLocation = "./images/randomNft"

const metaDataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
}

let tokenURIs = [
    "ipfs://QmcrqxtNjHJegn4Hb4w7FqKBuTzVpyMkuYg17h8Z1ohain",
    "ipfs://Qmami5EQMznMZg9hMfkMWuU3T1ke4ESvrUbaUASwAaLR42",
    "ipfs://QmZbVuoDVKp5oD5Kw75rfX7Ey5Xpr2ERWSUMZv1Hmb97fq",
]

const FUND_AMOUNT = "1000000000000000000000" // 10 LNK or use ethers.parse

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    // upload images

    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenURIs = await handleTokenURIs()
    }

    let vrfCoordinatorV2Address, subScriptionId
    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
        const tx = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await tx.wait(1)
        subScriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subScriptionId, FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
        subScriptionId = networkConfig[chainId].subScriptionId
    }

    log("======================================")
    // await storeImages(imgagesLocation)
    // set arguments same order as constructor
    const args = [
        vrfCoordinatorV2Address,
        subScriptionId,
        networkConfig[chainId]["gasLane"],
        networkConfig[chainId]["callbackGasLimit"],
        tokenURIs,
        networkConfig[chainId]["mintFee"],
    ]
    log("Arguments======================")
    log(args)
    const randomIpfsNft = await deploy("RandomIpfsNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("Verifying ======================================")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying================")
        await verify(randomIpfsNft.address, args)
    }
    log("============================")
}

async function handleTokenURIs() {
    tokenURIs = []
    // store the image in IPFS
    // sotre the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponseIndex in imageUploadResponses) {
        // create metadata
        // upload metadat
        let tokenURIMetadata = { ...metaDataTemplate }
        // ... three dot means unpact
        tokenURIMetadata.name = files[imageUploadResponseIndex].replace(".png", "")
        // takes filename as name without file extension
        tokenURIMetadata.description = `An adorable ${tokenURIMetadata.name} pub!`
        tokenURIMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenURIMetadata.name}...`)
        // store the JSON to pinata / IPFS
        const metadataUploadResponse = await storeTokenURIMetadata(tokenURIMetadata)
        tokenURIs.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded! They are :")
    console.log(tokenURIs)
    return tokenURIs
}
module.exports.tags = ["all", "randomipfs", "main"]
