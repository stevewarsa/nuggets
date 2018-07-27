import { Injectable, Inject } from '@angular/core';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmComponent } from 'src/app/confirm/confirm.component';
import { DOCUMENT } from "@angular/common";
import { AlertComponent } from 'src/app/alert/alert.component';

@Injectable({
  providedIn: 'root'
})
export class ModalHelperService {
  private document;
  constructor(private modalService: NgbModal, @Inject(DOCUMENT) document) { 
    this.document = document;
  }

  
  confirm(obj: { message: string; header?: string; labels?: string[] }): NgbModalRef {
    const modalRef: NgbModalRef = this.openModal(ConfirmComponent);
    const confirmComp: ConfirmComponent = modalRef.componentInstance as ConfirmComponent;
    confirmComp.header = obj.header || "Confirm";
    confirmComp.message = obj.message;
    confirmComp.labels = obj.labels || [];
    return modalRef;
  }

  alert(obj: { message: string; header?: string }): NgbModalRef {
    const modalRef: NgbModalRef = this.openModal(AlertComponent);
    const alertComp: AlertComponent = modalRef.componentInstance as AlertComponent;
    alertComp.header = obj.header || "Info";
    alertComp.message = obj.message;
    return modalRef;
  }

  private openModal(content: any, size: "sm" | "md" | "lg" = "lg", xl = false): NgbModalRef {
    let modalOptions: NgbModalOptions = { backdrop: "static", size: size === "md" ? null : size, windowClass: xl ? "xl-modal" : "" };
    let modalRef = this.modalService.open(content, modalOptions);
    setTimeout(() => {
      let modals = this.document.getElementsByClassName("modal-content");
      if (modals.length > 1) {
        let lastModal = modals[modals.length - 1] as HTMLElement;
        lastModal.style.top = 12 * (modals.length - 1) + "px";
        lastModal.style.left = 12 * (modals.length - 1) + "px";
      }
    }, 500);
    return modalRef;
  }
}
