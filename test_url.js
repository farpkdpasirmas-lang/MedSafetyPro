const AuthService = {
    basePath: '',
    getAbsoluteUrl: function (relativePath) {
        if (relativePath.startsWith('http')) return relativePath;

        let origin = "http://localhost:8000";
        let pathArray = "/subfolder/index.html".split('/');
        pathArray.pop(); // Remove current file

        let parts = (this.basePath + relativePath).split('/');

        for (let part of parts) {
            if (part === '') continue;
            if (part === '.') continue;
            if (part === '..') {
                pathArray.pop();
            } else {
                pathArray.push(part);
            }
        }

        return origin + pathArray.join('/');
    }
};

AuthService.basePath = '../';
console.log("FROM ADMIN/INDEX.HTML (basePath='../'):");
console.log("  Redirect to index.html ->", AuthService.getAbsoluteUrl('index.html'));
console.log("  Redirect to login.html ->", AuthService.getAbsoluteUrl('login.html'));

AuthService.basePath = '';
console.log("\nFROM ROOT INDEX.HTML (basePath=''):");
console.log("  Redirect to dashboard.html ->", AuthService.getAbsoluteUrl('dashboard.html'));

console.log("\nEXPECTED FOR ADMIN:");
console.log("  http://localhost:8000/index.html");
console.log("  http://localhost:8000/login.html");
