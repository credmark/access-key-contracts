const StakedCredmark = artifacts.require("StakedCredmark");
const MockCMK = artifacts.require("MockCMK")

contract("StakedCredmark Test", async accounts => {
    before(async () => {
        MAIN_ADDRESS = accounts[0];
        //cmk_instance = await MockCMK.deployed();
    });
    it("text", async () => {


    });
});