import {AfterViewInit, Component, ElementRef, NgZone, OnInit, QueryList, ViewChildren} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {StatusBarService} from "../../layout/status-bar/status-bar.service";
import {StatusControlProvider} from "../../layout/status-bar/status-control-provider.interface";
import {IpcService} from "../../services/ipc.service";
import {MenuItem} from "../../ui/menu/menu-item";
import {DirectiveBase} from "../../util/directive-base/directive-base";
import {TabData} from "./tab-data.interface";
import {WorkboxService} from "./workbox.service";

@Component({
    selector: "ct-workbox",
    styleUrls: ["./workbox.component.scss"],
    template: `
        <div class="head">

            <ul class="tab-bar inset-panel" tabindex="-1">

                <li *ngFor="let tab of tabs;"
                    [ct-drag-over]="true"
                    (onDragOver)="workbox.openTab(tab)"
                    (click)="workbox.openTab(tab)"
                    [class.active]="tab === (workbox.activeTab | async)"
                    [ct-context]="createContextMenu(tab)"
                    class="tab clickable">
                    <div class="title">{{ tab.title | async }}</div>
                    <div (click)="removeTab(tab)" class="close-icon"><b>×</b></div>
                </li>

                <li class="ct-workbox-add-tab-icon clickable">
                    <i class="fa fa-plus" aria-hidden="true" (click)="openNewFileTab()"></i>
                </li>

            </ul>

            <ct-settings-button></ct-settings-button>
        </div>

        <div class="body">

            <template ngFor let-tab [ngForOf]="tabs">

                <div class="component-container" [ngSwitch]="tab?.contentType | async" [hidden]="tab !== activeTab">
                    <ct-tool-editor class="tab-component" #tabComponent *ngSwitchCase="'CommandLineTool'"
                                    [data]="tab.contentData"></ct-tool-editor>
                    <ct-workflow-editor #tabComponent [data]="tab.contentData" *ngSwitchCase="'Workflow'"></ct-workflow-editor>
                    <ct-file-editor class="tab-component" [data]="tab.contentData" *ngSwitchCase="'Code'"></ct-file-editor>
                    <ct-welcome-tab class="tab-component" *ngSwitchCase="'Welcome'"></ct-welcome-tab>
                    <ct-new-file-tab class="tab-component" *ngSwitchCase="'NewFile'"></ct-new-file-tab>
                    <ct-settings class="tab-component" *ngSwitchCase="'Settings'"></ct-settings>
                    <ct-tab-loader class="tab-component" *ngSwitchDefault></ct-tab-loader>
                </div>

            </template>

        </div>
    `
})
export class WorkboxComponent extends DirectiveBase implements OnInit, AfterViewInit {

    /** List of tab data objects */
    public tabs: TabData<any>[] = [];

    /** Reference to an active tab object */
    public activeTab;

    private el: Element;

    @ViewChildren("tabComponent")
    private tabComponents: QueryList<any>;

    constructor(private ipc: IpcService,
                public workbox: WorkboxService,
                private statusBar: StatusBarService,
                private zone: NgZone,
                el: ElementRef) {
        super();
        this.el = el.nativeElement;
    }

    ngOnInit() {

        // FIXME: this needs to be handled in a system-specific way
        // Listen for a shortcut that should close the active tab
        this.tracked = this.ipc.watch("accelerator", "CmdOrCtrl+W").subscribe(() => {
            this.workbox.closeTab();
        });

        // Switch to the tab on the right
        this.tracked = this.ipc.watch("accelerator", "CmdOrCtrl+Shift+]")
            .filter(_ => this.activeTab && this.tabs.length > 1)
            .subscribe(() => {
                this.workbox.activateNext();
            });

        // Switch to the tab on the left
        this.tracked = this.ipc.watch("accelerator", "CmdOrCtrl+Shift+[")
            .filter(_ => this.activeTab && this.tabs.length > 1)
            .subscribe(() => {
                this.workbox.activatePrevious();
            });


        this.tracked = this.workbox.tabs.subscribe(tabs => {
            this.tabs = tabs;
        });

        setTimeout(() => {
            this.openWelcomeTab();
        });

    }

    ngAfterViewInit() {
        this.tracked = this.workbox.activeTab.subscribe(tab => {
            this.statusBar.removeControls();

            this.activeTab = tab;
            const idx      = this.tabs.findIndex(t => t === tab);

            const component = this.tabComponents.find((item, index) => index === idx);

            if (component && (component as StatusControlProvider).provideStatusControls) {
                this.statusBar.setControls(component.provideStatusControls());
            }
        });
    }

    /**
     * Removes a tab by index
     */
    public removeTab(tab) {
        this.workbox.closeTab(tab);
    }

    /**
     * Removes all tabs except one
     */
    private removeOtherTabs(tab) {
        this.workbox.closeOtherTabs(tab);
    }

    /**
     * Removes all tabs
     */
    private removeAllTabs() {
        this.workbox.closeAllTabs();
    }

    /**
     * Opens a new file tab
     */
    openNewFileTab() {
        this.workbox.openTab({
            id: "newFile",
            title: Observable.of("NewFile"),
            contentType: Observable.of("NewFile"),
            contentData: {}
        });
    }

    /**
     * Opens a welcome tab
     */
    openWelcomeTab() {
        this.workbox.openTab({
            id: "welcome",
            title: Observable.of("Welcome"),
            contentType: Observable.of("Welcome"),
            contentData: {}
        });
    }

    createContextMenu(tab): MenuItem[] {
        const closeOthers = new MenuItem("Close Others", {
            click: () => this.removeOtherTabs(tab)
        });

        const closeAll = new MenuItem("Close All", {
            click: () => this.removeAllTabs()
        });

        return [closeOthers, closeAll];
    }
}
