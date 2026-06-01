"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlagiarismModule = void 0;
const common_1 = require("@nestjs/common");
const plagiarism_controller_1 = require("./plagiarism.controller");
const plagiarism_service_1 = require("./plagiarism.service");
let PlagiarismModule = class PlagiarismModule {
};
exports.PlagiarismModule = PlagiarismModule;
exports.PlagiarismModule = PlagiarismModule = __decorate([
    (0, common_1.Module)({
        controllers: [plagiarism_controller_1.PlagiarismController],
        providers: [plagiarism_service_1.PlagiarismService],
        exports: [plagiarism_service_1.PlagiarismService],
    })
], PlagiarismModule);
//# sourceMappingURL=plagiarism.module.js.map