import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField} from "@mui/material";
import React, {Component} from "react";

export class DialogComponent extends Component<any, any> {
    constructor(props: any) {
        super(props);

    }

    handleClose(result) {
        if(this.props.onResult) {
            this.props.onResult(result);
        }
    }

    render () {

    return (
        <Dialog open={this.props.show} onClose={this.handleClose}>
            <DialogTitle>Select</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {this.props.label}
                </DialogContentText>
                {this.props.children}

            </DialogContent>
            <DialogActions>
                <Button onClick={()=>this.handleClose(false)}>Cancel</Button>
                <Button onClick={()=>this.handleClose(true)}>Save</Button>
            </DialogActions>
        </Dialog>);
    }

}