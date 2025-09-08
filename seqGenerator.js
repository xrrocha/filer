
function SeqGenerator({startWith = 0, incrementBy = 1}) {
    let val = startWith;
    this.nextVal = () => {
        const retVal = val;
        val += incrementBy;
        return retVal;
    };
}

// Global sequence generator for meta objects
const metaObjectSeq = new SeqGenerator({}); // Initialize with empty object to use defaults

export { SeqGenerator, metaObjectSeq };

