Ext.define('Niks.ui.UserPopover', {
        alias: 'widget.rallyuserpopover',
        extend:  Rally.ui.popover.ListViewPopover ,

        id: 'user-popover',
        cls: 'userstory-popover',
        title: 'Users',
        titleIconCls: 'icon-user',
        maxHeight: 600,
        constructor: function(config) {

            var app = Ext.getCmp('projectApp');

            config.listViewConfig = Ext.merge({
                model: Ext.identityFn('User'),
                childField: app.getSetting('userGroup'),
                addNewConfig: null,
                gridConfig: {
                    stateful: true,
//                    stateId: app.getContext().getScopedStateId('gridConfig'),
                    enableEditing: false,
                    store: config.recordStore,
                    columnCfgs: [
                        {
                            dataIndex: 'DisplayName',
                            width: 90
                        },
                        {
                            dataIndex: 'EmailAddress',
                            flex: 90
                        },
                        {
                            dataIndex: 'Role',
                            width: 180
                        },
                        {
                            dataIndex: 'UserName',
                            width: 180
                        }
                    ]
                }
            }, config.listViewConfig);

            this.callParent(arguments);
        }
});

Ext.define( 'Rally.ui.tree.extendedTreeItem' , {
    alias: 'widget.extendedTreeItem',
    extend: 'Rally.ui.tree.TreeItem',
    config: {
        displayedFields: ['Name', 'Description', 'TeamMembers']
    },
    initComponent: function() {
        this.callParent(arguments);
        this.on('afterrender', function() {


            //Do in two steps to keep in sync
            if (this._getAutoExpanded()) {
                this.setExpanded(true);
            }

            this.draw();

            if (this._getAutoExpanded()) {
                this.fireEvent('expand', this);
            }
        }, this);

    },

    _getAutoExpanded: function() {
        var app = this.up('#projectApp');

        return app.getSetting('autoExpand');
    },

    // _checkPermissions: function( member, record) {

    //     //Need to get back to the app to fetch the userInfo
    //     var app = this.up('#projectApp');
    //     var user = app._findUser(member, app);

    //     //Now look in the user.permissions for the access to this 'record'

    //     var projectPermissions = _.filter(user.permissions, function (permission) {
    //         return permission.get('Project')._ref === record.get('_ref');
    //     });

    //     if (projectPermissions.length === 0) return app.getSetting('showViewers')? app.PERMISSIONS.Viewer : null;

    //     var isProjectAdmin = (_.find(projectPermissions, function(permission) {
    //         return (permission.get('Role') === 'Admin');

    //     }) !== undefined);

    //     if (app.getSetting('projectAdminsOnly') && !isProjectAdmin) { return null;}

    //     var isEditor = (_.find(projectPermissions, function(permission) {
    //         return (permission.get('Role') === 'Editor');

    //     }) !== undefined);



    //     return isEditor ? app.EDITOR : isProjectAdmin ? app.PROJECT_ADMIN : app.ADMIN;
    // },

    getContentTpl: function() {
        var me = this;

        return Ext.create('Ext.XTemplate',
            '<tpl if="this.canDrag()"><div class="icon drag"></div></tpl>',
            '{[this.getActionsGear()]}',
            '<div class="textContent ellipses">{[this.getFormattedId()]} {[this.getSeparator()]}{Name} ({[this.getOwner()]})</div>',
            '<div class="rightSide">',
            '</div>',
            {
                canDrag: function() {
                    return me.getCanDrag();
                },
                getActionsGear: function() {
                    return me._buildActionsGearHtml();
                },
                getFormattedId: function() {
                    var record = me.getRecord();
                    return record.getField('FormattedID') ? Rally.ui.renderer.RendererFactory.renderRecordField(record, 'FormattedID') : '';
                },
                getSeparator: function() {
                    return this.getFormattedId() ? '- ' : '';
                },
                getOwner: function() {
                    var record = me.getRecord();
                    return record.getField('Owner') ? Rally.ui.renderer.RendererFactory.renderRecordField(record, 'Owner') : '';
                }
            }
        );
    },

    draw: function() {
        var me = this;

        if (this.content) {
            this.content.destroy();
        }

        var cls = 'treeItemContent';
        if (this.getSelectable()) {
            cls += ' selectable';
        }

        if (!this.expander) {
            this.expander = this.drawExpander();
        } else {
            this.toggleExpander();
        }

        pe = window.document.getElementById((this.parentTreeItem?this.parentTreeItem.id:this.id));

        this.insert(1, {

            xtype: 'container',
            itemId: 'treeItemContent',
            id: Ext.id(),
            cls: cls,
            layout: {
                type: 'hbox'
            },
            items: [
                {
                    xtype: 'component',
                    renderTpl: this.getContentTpl(),
                    renderData: this.getRenderData(),
                    listeners: {
                        afterrender: function() {
                            this.setupListeners();
                        },
                        scope: this
                    }
                },
                {
                    xtype: 'fieldcontainer',
                    itemId: 'userInfoRecord',
                    layout: {
                        type: 'anchor'
                    },
                    defaults: {
                        layout: '100%'
                    },
                    style: {
                        marginLeft: '50px',
                        border: 15
                    },
                    listeners: {
                        afterrender: function(cmp) {
                            var treeItem = me;
                            var record = me.getRecord();
                            var app = this.up('#projectApp');

                            var fieldName = app.getSetting('userGroup');

                            Rally.data.ModelFactory.getModel({ type: 'User',
                                success: function(model) {

                                    var store = record.getCollection(fieldName, {
                                        filters: app._getFilters(app),
                                        fetch: [ 'WorkspacePermission', 'EmailAddress', 'Role', 'Username', 'UserPermissions', 'TeamMemberships', 'DisplayName']
                                    });
                                    store.load().then({
                                        success: function(data) {

                                            store.model = model;
                                            var popOver;
                                            var thisPopoverCfg = Ext.clone({
                                                record: record,
                                                target: cmp.getTargetEl(),
                                                field: fieldName,
                                                title: fieldName,
                                                autoShow: true,
                                                recordStore: store
                                            });
                                            if (data.length > 0) {
                                                cmp.getTargetEl().on('click', function() { Ext.create('Niks.ui.UserPopover', thisPopoverCfg);});
                                            }
                                            cmp.suspendLayouts();

                                            _.each(data, function(member) {
                                                var mseSelected;
                                                var thisBorder = app._checkPermissions(member, record, app);
                                                if (thisBorder !== null) {
                                                    var user = Ext.clone(
                                                        {   xtype: 'textfield',
                                                            readOnly: true,
                                                            border: '0 0 0 5',
                                                            style: {
                                                                borderColor: app.PERMISSIONS[thisBorder],
                                                                borderStyle: 'solid',
                                                                marginLeft: '10px'
                                                            },
                                                            userId: member.get('_refObjectUUID'),
                                                            value: member.get('_refObjectName')
                                                        });
                                                        
                                                    cmp.add(user);
                                                }
                                            });
                                            cmp.resumeLayouts();

                                            //If you want instant update to show the users, add this line in. If you don't the
                                            //users get shown on the next redraw of the tree - which is actually useful, unless you want to
                                            //see the userlist associated with project nodes with no children - then you have to make a redraw by expanding and
                                            //collapsing another project node
                                            cmp.updateLayout();

                                            //Bring the parent back into view
//                                            pe.scrollIntoView(null,true,true,true);
                                        }
                                    });
                                },
                                failure: function() {
                                    console.log("Failed to get model for 'User'");
                                }
                            });
                        }
                    }
                }
            ]
        });

    }
});

Ext.define('Niks.apps.ProjectTreeApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    itemId: 'projectApp',
    id: 'projectApp',
    stateful: true,
      
    PERMISSIONS: {
        "Editor": 'lightgreen',
        'Viewer': 'lightblue',
        'Admin': "red",
        'Project Admin': 'orange'
    },
    config: {
        defaultSettings: {
            userGroup: 'Editors',
            autoExpand: true,
            projectAdminsOnly: false,
            showViewers: false
        }
    },

    getSettingsFields: function() {
        var me = this;
        return [
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Project Admins Only',
                labelWidth: 200,
                name: 'projectAdminsOnly'
            },
            {
                xtype: 'radiogroup',
                fieldLabel: 'User Type Selection',
                labelWidth: 200,
                style: {
                    borderColor: '#e0e0e0',
                    borderStyle: 'solid none',
                    borderWidth: 'thick'
                },
                name: 'typeGroup',
                columns : 1,
                items: [
                    { boxLabel: 'Editors', name: 'userGroup', inputValue: 'Editors'},
                    { boxLabel: 'Team Members', name: 'userGroup', inputValue: 'TeamMembers' }
                ],
                listeners: {
                    afterrender: function(box){
                        box.setValue({ userGroup: me.getSetting('userGroup')});
                    }
                }
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Auto Expand Tree',
                labelWidth: 200,
                name: 'autoExpand'
            },
            {
                xtype: 'rallycheckboxfield',
                fieldLabel: 'Show Viewers',
                labelWidth: 200,
                name: 'showViewers'
            }
        ];
    },
    _buildLegend: function(){
        return {
            xtype: 'container',
            margin: '5 0 20 0',
            layout: 'hbox',
            items: [
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 10px;padding-right: 20px">Permission Colour Coding:   </div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid ' + this.PERMISSIONS.Admin + '">Workspace Admin</div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid ' + this.PERMISSIONS["Project Admin"] + '">Project Admin</div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid ' + this.PERMISSIONS.Editor + '">Project Editor</div>'
                },
                {
                    xtype: 'container',
                    html: '<div style="margin-left: 10px; padding-left: 3px; padding-right: 10px; border-left: 5px solid ' + this.PERMISSIONS.Viewer + '">Project Viewer</div>'
                }
            ]
        };
    },
    _getFilters: function(app) {

        var filters = [];
        if (app.getSetting('userGroup') !== 'TeamMembers'){
             filters = [ Rally.data.wsapi.Filter.or([
                {
                    property: 'WorkspacePermission',
                    operator: '=',
                    value: 'Workspace User'
                },
                {
                    property: 'WorkspacePermission',
                    operator: '=',
                    value: 'Project Admin'
                }
            ])];
        }

        if (app.getSetting('projectAdminsOnly') === true) {
            filters = [
                {
                    property: 'WorkspacePermission',
                    value: 'Project Admin'
                }
            ];
        }
        return filters;
    },

    userInfo: {}, //[],
    projectInfo: [],

    launch: function() {

        var app = this;
        this.add(this._buildLegend());

        var pt = Ext.create( 'Rally.ui.tree.ProjectTree', {
            config: {
                //We are going to enforce that this works within the context the user is at.
                itemId: 'projectTree',
                topLevelModel: 'Project',
                treeItemConfigForRecordFn:  function(record) {
                    return {
                        xtype: 'extendedTreeItem',
                        selectable: true
                    };
                },
                topLevelStoreConfig: {
                    fetch: ['Name', 'Owner', 'State', 'Children:summary[State]', 'Workspace', 'Editors', 'TeamMembers'],
                    hydrate: ['Owner'],
                    filters: [{
                        property: 'ObjectID',
                        value: app.getContext().getProject().ObjectID
                    }],
                    sorters: [{
                        property: 'Name',
                        direction: 'ASC'
                    }],
                },

                childItemsStoreConfigForParentRecordFn: function(record){
                    var storeConfig = {
                        fetch: ['Name', 'Description', 'Owner', 'Children:summary[State]', 'State', 'Workspace'],
                        hydrate: ['Owner'],
                        sorters: [{
                            property: 'Name',
                            direction: 'ASC'
                        }]
                    };
                    return Ext.apply(storeConfig, {
                        filters: [{
                            property: 'Parent',
                            value: record.get('_ref')
                        }],
                        context: {
                            workspace: record.get('Workspace')._ref,
                            project: null
                        }
                    });
                },
                handleChildItemStoreLoad: function(store, records, parentTreeItem) {
                    var me = this;
                    // For each record, fetch the TeamMembers, Viewers and the Editors
                    app._getUserDetails(records,app).then({
                        success: function(newUsers) { 
                            _.each(newUsers, function(user) {
                                //app.userInfo.push(user);
                                app.userInfo[user.get('_refObjectUUID')] = user;
                            });
                            me.renderChildRecords(records, parentTreeItem); 
                        },
                        failure: function() {
                            console.log("Failed to get User details in handleChildItemStoreLoad");
                        }
                    });
                },
                handleParentItemStoreLoad: function(store, records) {
                    var me = this;
                    // For each record, fetch the TeamMembers, Viewers and the Editors
                    app._getUserDetails(records,app).then({
                        success: function(newUsers) { 
                            _.each(newUsers, function(user) {
                                //app.userInfo.push(user);
                                app.userInfo[user.get('_refObjectUUID')] = user;
                            });
                            me.renderParentRecords(records); 
                        },
                        failure: function() {
                            console.log("Failed to get User details in handleParentItemStoreLoad");
                        }

                    });
                }
            },
        });

       this.add(pt);
       
       this.add({
            xtype: 'rallybutton',
            text: "Export",
            handler: this._doExport,
            scope: app 
        }); 
    },
    _doExport: function() {
        var rowData = this._extractExportData();
        var rowHeadersHash = {
            "Project": "Project",
            "DisplayName": "Display Name",
            "Permission":"Permission"
        };
        this._saveExportDataFile(rowData, rowHeadersHash); 
    },
    _extractExportData: function(){
       console.log('_extractExportData');
       var treeItems = this.query('extendedTreeItem');
       var rows = [];
       for (var i=0; i<treeItems.length; i++){
           var project = treeItems[i].getRecord(); 
           var users = treeItems[i].down('#treeItemContent').down('#userInfoRecord').query('textfield');
           for (var j=0; j<users.length; j++){
               var row = {};
               row.Project = project.get('Name');
               var foundUser = this._findUser(users[j].userId, this);
               var permission = this._checkPermissions(users[j].userId,project,this);
               row.DisplayName = foundUser.get('_refObjectName');
               row.Permission = permission;
               rows.push(row);
           }
       }
       return rows;
    },
    _saveExportDataFile: function(rowData, rowHeaders){
        var fileText = CArABU.technicalservices.FileUtilities.convertDataArrayToCSVText(rowData,rowHeaders);
        var fileName = Ext.String.format("projecttree-{0}.csv", new Date().toISOString());
        CArABU.technicalservices.FileUtilities.saveTextAsFile(fileText,fileName);
    },
    _getUserDetails: function(records,app) {
        var deferred = Ext.create('Deft.Deferred');

        var promises = [];

        _.each(records, function(record) {
            var config = Ext.clone(
                {
                    filters: app._getFilters(app),
                    fetch: [ 'WorkspacePermission', 'UserPermissions', 'DisplayName']
                }
            );
            promises.push(record.getCollection(app.getSetting('userGroup')).load(config));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                // For every user that we know about, we need to get all the project permissions that they have to specifically
                // colour the display differently for each project they appear in

                var updateUserPermissionsList = [];

                _.each(results, function(userList) {
                    if (userList.length === 0) {  return; }
                    
                    _.each(userList, function( user) {
                        if ( app._findUser(user, app) === undefined) {
                            updateUserPermissionsList.push(user);
                        }
                    });
                });

                if (updateUserPermissionsList.length > 0)  {
                    app._getUserPermissions(updateUserPermissionsList).then({
                        success: function(results) {
                            deferred.resolve(updateUserPermissionsList);
                        },
                        failure: function() {
                            console.log("Failed to get new users permissions for ", updateUserPermissionsList);
                            deferred.reject();
                        }
                    });
                }
                else {
                    deferred.resolve();
                }
            },

            failure: function() {
                console.log("Faailed to get users for projects");
                deferred.reject();
            }

        });
        return deferred.promise;
    },

    _getUserPermissions: function(userList) {
        var deferred = Ext.create('Deft.Deferred');
        var promises = [];

        _.each(userList, function(user) {

            var filters = Ext.clone(
                [
                    {
                        property: 'User',
                        value: user.get('_ref')
                    },
                    {
                        property: 'Workspace',
                        value: Ext.getCmp('projectApp').getContext().getWorkspace()._ref
                    }
                ]
            );

            promises.push( Ext.create('Rally.data.wsapi.Store', {
                model: 'ProjectPermission',
                filters: filters,
                listeners: {
                    load: function(store,records) {
                        user.permissions = records;
                    }
                }
            }).load());

            // promises.push(user.getCollection('UserPermissions').load( {
            //     fetch: ['Project', 'Role'],
            //     callback: function(results) {
            //         user.permissions = results;
            //     }
            // }));
        });

        Deft.Promise.all(promises).then({
            success: function(results) {
                deferred.resolve(results);
            },
            failure: function() {
                console.log("Failed in _getUserPermissions");
                deferred.reject();
            }
        });

        return deferred.promise;
    },

    _findUser: function(user, app) {
        if (Ext.isObject(user)){
            user = user.get('_refObjectUUID');
        }
        return app.userInfo[user];
        return _.find(app.userInfo, function(knownUser) {
            return knownUser.get('_refObjectUUID') === user.get('_refObjectUUID');
        });
    },
    _checkPermissions: function( member, record, app) {

        //Need to get back to the app to fetch the userInfo
        var user = app._findUser(member, app);

        //Now look in the user.permissions for the access to this 'record'

        var projectPermissions = _.filter(user.permissions, function (permission) {
            return permission.get('Project')._ref === record.get('_ref');
        });

        if (projectPermissions.length === 0) return app.getSetting('showViewers')? app.PERMISSIONS.Viewer : null;

        var isProjectAdmin = (_.find(projectPermissions, function(permission) {
            return (permission.get('Role') === 'Admin');

        }) !== undefined);

        if (app.getSetting('projectAdminsOnly') && !isProjectAdmin) { return null;}

        var isEditor = (_.find(projectPermissions, function(permission) {
            return (permission.get('Role') === 'Editor');

        }) !== undefined);



        return isEditor ? 'Editor' : isProjectAdmin ? 'Project Admin' : 'Admin';
    },
});
