import {Component, OnInit, OnDestroy} from "@angular/core";
import {REACTIVE_FORM_DIRECTIVES, FORM_DIRECTIVES} from "@angular/forms";
import {ExpressionInputComponent} from "../../forms/inputs/types/expression-input.component";
import {CommandInputParameterModel as InputProperty} from "cwlts/models/d2sb";
import {Subscription} from "rxjs/Subscription";
import {InputSidebarService} from "../../../services/sidebars/input-sidebar.service";
import {BasicInputSectionComponent} from "./basic-section/basic-input-section.component";

require("./input-inspector.component.scss");

@Component({
    selector: "input-inspector",
    directives: [
        REACTIVE_FORM_DIRECTIVES,
        FORM_DIRECTIVES,
        ExpressionInputComponent,
        BasicInputSectionComponent
    ],
    template: `
            <form class="input-inspector-component object-inspector" *ngIf="selectedProperty">
                <div>
                    <span class="input-text">Input</span>
                    <i class="fa fa-info-circle info-icon"></i>
                </div>
            
                <basic-input-section [selectedProperty]="selectedProperty"></basic-input-section>
            </form>
    `
})
export class InputInspectorComponent implements OnInit, OnDestroy {

    /** The currently displayed property */
    private selectedProperty: InputProperty;

    private subs: Subscription[] = [];

    constructor(private inputSidebarService: InputSidebarService) { }

    ngOnInit(): void {
        this.subs.push(
            this.inputSidebarService.inputPortDataStream.subscribe((input: InputProperty) => {
                this.selectedProperty = input;
            })
        );
    }

    ngOnDestroy(): void {
        this.subs.forEach(sub => sub.unsubscribe());
    }
}
