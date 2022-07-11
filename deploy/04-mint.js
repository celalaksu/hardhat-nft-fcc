const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts
    // Our deployer is jusnt gonna be used to mint them.

    //MINT BASIC NFT
    const basicNft = await ethers.getContract("BasicNFT", deployer)
    const basicMintTx = await basicNft.mintNFT()
    await basicMintTx.wait(1)
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`)

    // RANDOM IPFS MINT
    const randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
    const mintFee = await randomIpfsNft.getMintFee()

    // Here were going to have to do this await new promise. Because we need to wait for it
    // to return need to listen for those events. We probablly should set up the listener first.
    await new Promise(async (resolve, reject) => {
        setTimeout(resolve, 30000) // 5 minutes
        randomIpfsNft.once("NftMinted", async function () {
            resolve()
        })
        const randomIpfsNftTx = await randomIpfsNft.requestNFT({ value: mintFee.toString() })
        const randomIpfsNftTxReceipt = await randomIpfsNftTx.wait(1)
        if (developmentChains.includes(network.name)) {
            const requestId = randomIpfsNftTxReceipt.events[1].args.requestId.toString()
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.address)
        }
    })
    console.log(`Random IPFS NFT index 0 tokenURI: ${await randomIpfsNft.tokenURI(0)}`)

    // Dynamic SVG NFT Mint
    const highValue = ethers.utils.parseEther("4000")
    const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer)
    const dynamicSvgNftMintTx = await dynamicSvgNft.mintNft(highValue.toString())
    await dynamicSvgNftMintTx.wait(1)
    console.log(`Dynamic SVG NFT index 0 tokenURI: ${await dynamicSvgNft.tokenURI(0)}`)
}
module.exports.tags = ["all", "mint"]
