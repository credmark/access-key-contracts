const ExponentialEmitter = artifacts.require("ExponentialEmitter");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

contract("Exponential Emitter Test", async accounts => {
    before(async () => {
        instance = await ExponentialEmitter.new(100);
    });
    it("should emit based on time", async () => {
        console.log("here we go")
      const power = await instance.power.call(1,2,1,2).valueOf();
      console.log(power[0].toString(), power[1].toString(), (power[0]/(2**power[1]).toString()));
      await instance.emitToken.call();
      
    });
});