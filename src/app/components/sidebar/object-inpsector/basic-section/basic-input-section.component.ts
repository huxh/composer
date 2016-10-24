import {Component, OnInit, Input} from "@angular/core";
import {Validators, FormBuilder, FormGroup, REACTIVE_FORM_DIRECTIVES, FORM_DIRECTIVES} from "@angular/forms";
import {ExpressionModel, CommandInputParameterModel as InputProperty} from "cwlts/models/d2sb";
import {Subscription} from "rxjs/Subscription";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {ExpressionSidebarService} from "../../../../services/sidebars/expression-sidebar.service";
import {Expression} from "cwlts/mappings/d2sb/Expression";
import {SandboxService, SandboxResponse} from "../../../../services/sandbox/sandbox.service";
import {BasicInputSectionComponent} from "../basic-section/basic-input-section.component";
import {ToggleComponent} from "../../../common/toggle-slider/toggle-slider.component";

require("./basic-input-section.component.scss");

@Component({
    selector: "basic-input-section",
    directives: [
        REACTIVE_FORM_DIRECTIVES,
        FORM_DIRECTIVES,
        ToggleComponent
    ],
    template: `
          <form class="basic-input-section" *ngIf="selectedProperty">
                <div class="section-text">
                     <span>Basic</span>
                </div>
            
                <div class="form-group flex-container">
                    <label>Required</label>
                    
                    <span class="align-right">
                        {{selectedProperty.isRequired ? "Yes" : "No"}}
                       
                        <toggle-slider [(checked)]="selectedProperty.isRequired"></toggle-slider>
                    </span>
                </div>
            
                <div class="form-group">
                    <label for="inputId">ID</label>
                    <input type="text" 
                           name="selectedPropertyId" 
                           id="inputId" 
                           class="form-control"
                           [(ngModel)]="selectedProperty.id">
                </div>
                
                <div class="form-group">
                    <label for="inputType">Type</label>
                    
                    <select class="form-control" 
                    name="selectedPropertyType" 
                    id="dataType"
                    [(ngModel)]="selectedProperty.type" required>
                        <option *ngFor="let propertyType of propertyTypes" [value]="propertyType">
                            {{propertyType}}
                        </option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Value</label>
                    
                    <expression-input *ngIf="expressionInputForm && expressionInputForm.controls['expressionInput']"
                                    [disabled]="hasInputBinding === false"
                                    [(expression)]="expressionInput"
                                    [control]="expressionInputForm.controls['expressionInput']"
                                    (onSelect)="addExpression()">
                    </expression-input>
                    
                </div>
                
                <div class="form-group flex-container">
                    <label>Include in command line</label>
                    
                    <span class="align-right">
                        {{hasInputBinding ? "Yes" : "No"}}
                        <toggle-slider [(checked)]="hasInputBinding"
                                        (checkedChange)="toggleInputBinding(hasInputBinding)"></toggle-slider>
                    </span>
                </div>
            </form>
    `
})
export class BasicInputSectionComponent implements OnInit {

    /** The currently displayed property */
    @Input()
    private selectedProperty: InputProperty;

    private inputBinding: BehaviorSubject<string | Expression> = new BehaviorSubject<string | Expression>(undefined);

    private expressionInput: ExpressionModel = new ExpressionModel({});

    /** Possible property types */
    private propertyTypes = ["File", "string", "enum", "int", "float", "boolean", "array", "record", "map"];

    private subs: Subscription[] = [];

    private expressionInputSub: Subscription;

    private expressionInputForm: FormGroup;

    private sandboxService: SandboxService;

    private hasInputBinding: boolean = false;

    constructor(private formBuilder: FormBuilder,
                private expressionSidebarService: ExpressionSidebarService) {
        this.subs = [];
        this.sandboxService = new SandboxService();
    }

    ngOnInit(): void {
        this.hasInputBinding = this.selectedProperty.hasInputBinding();
        this.inputBinding.next(this.selectedProperty.getValueFrom());

        this.subs.push(
            this.inputBinding
                .filter(expression => expression !== undefined)
                .mergeMap((expression: string | Expression) => {
                    let codeToEvaluate: string = "";

                    if ((<Expression>expression).script) {
                        codeToEvaluate = (<Expression>expression).script;
                        this.expressionInput.setValueToExpression(codeToEvaluate);
                    } else {
                        codeToEvaluate = <string>expression;
                        this.expressionInput.setValueToString(codeToEvaluate);
                    }

                    return this.sandboxService.submit(codeToEvaluate);
                })
                .subscribe((result: SandboxResponse) => {
                    if (result.error === undefined) {
                        this.expressionInput.setEvaluatedValue(this.sandboxService.getValueFromSandBoxResponse(result));
                        this.createExpressionInputForm(this.expressionInput.getEvaluatedValue());
                    }
                })
        );
    }

    private addExpression(): void {
        const newExpression: BehaviorSubject<ExpressionModel> = new BehaviorSubject<ExpressionModel>(undefined);
        this.removeExpressionInputSub();

        this.expressionInputSub = newExpression
            .filter(expression => expression !== undefined)
            .subscribe((newExpression: ExpressionModel) => {
                if ((<Expression>newExpression.serialize()).script) {
                    this.selectedProperty.setValueFrom(newExpression.serialize());
                }
                this.inputBinding.next(newExpression.serialize());
            });

        this.expressionSidebarService.openExpressionEditor({
            expression: this.expressionInput.getExpressionScript(),
            newExpressionChange: newExpression
        });
    }

    private removeExpressionInputSub(): void {
        if (this.expressionInputSub) {
            this.expressionInputSub.unsubscribe();
            this.expressionInputSub = undefined;
        }
    }

    private createExpressionInputForm(formValue: string) {

        if (this.expressionInputForm && this.expressionInputForm.controls['expressionInput']) {
            this.expressionInputForm.controls['expressionInput'].setValue(formValue);
        } else {
            this.expressionInputForm = this.formBuilder.group({
                ['expressionInput']: [formValue, Validators.compose([Validators.required, Validators.minLength(1)])]
            });

            const inputValueChange = this.expressionInputForm.controls['expressionInput'].valueChanges.subscribe((value) => {
                if (typeof this.expressionInput.serialize() === "string") {
                    this.expressionInput.setValueToString(value);
                    this.expressionInput.setEvaluatedValue(value);

                    this.selectedProperty.setValueFrom(value);
                }
            });

            this.subs.push(inputValueChange);
        }
    }

    private toggleInputBinding(hasBinding: boolean) {
        if (!hasBinding) {
            this.selectedProperty.hasInputBinding();
        }
    }

    ngOnDestroy(): void {
        this.subs.forEach(sub => sub.unsubscribe());
    }
}
