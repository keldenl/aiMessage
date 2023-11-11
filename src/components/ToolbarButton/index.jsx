import React from "react";
import { IonIcon } from "@ionic/react";
import "./ToolbarButton.css";

export default function ToolbarButton(props) {
  const { icon, onClick } = props;
  return <IonIcon className={`toolbar-button`} icon={icon} onClick={onClick} />;
}
