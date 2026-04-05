const wait = () => new Promise(resolve => setTimeout(resolve, 0));

function formatName(name) {
  return name.trim().toUpperCase();
}

module.exports = {
    wait,
    formatName
};
