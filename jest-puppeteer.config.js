module.exports = {
    server: {
        command: "yarn start --port 8081",
        launchTimeout: 30000,
        port: 8081,
        waitOnScheme: {
            resources: [
                "dist/umd/regular-table.js",
              ],
        },
    },
};
