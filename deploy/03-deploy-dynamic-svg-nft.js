const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId
    let ethUsdPriceFeeAddress
    log("Chain Id : ", chainId)

    if (developmentChains.includes(network.name)) {
        const EthUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeeAddress = EthUsdAggregator.address
    } else {
        ethUsdPriceFeeAddress = networkConfig[chainId].ethUsdPriceFeed
    }
    log("Deploying =============================")
    const lowSVG = fs.readFileSync("./images/dynamicNft/frown.svg", { encoding: "utf-8" })
    //log("LOW SVG", lowSVG)
    const highSVG = fs.readFileSync("./images/dynamicNft/happy.svg", { encoding: "utf-8" })
    //log("HİGH SVG", highSVG)
    args = [ethUsdPriceFeeAddress, lowSVG, highSVG]
    //log("arguments: ============", args)

    const dynamicSvgNft = await deploy("DynamicSvgNft", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log("Verifying ======================================")
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying================")
        await verify(dynamicSvgNft.address, args)
    }
    log("============================")
}

module.exports.tags = ["all", "dynamicsvg", "main"]
