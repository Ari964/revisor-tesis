"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThesisModule = void 0;
const common_1 = require("@nestjs/common");
const thesis_controller_1 = require("./thesis.controller");
const thesis_service_1 = require("./thesis.service");
let ThesisModule = class ThesisModule {
};
exports.ThesisModule = ThesisModule;
exports.ThesisModule = ThesisModule = __decorate([
    (0, common_1.Module)({
        controllers: [thesis_controller_1.ThesisController],
        providers: [thesis_service_1.ThesisService],
        exports: [thesis_service_1.ThesisService],
    })
], ThesisModule);
//# sourceMappingURL=thesis.module.js.map