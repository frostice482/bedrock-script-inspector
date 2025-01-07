import InspectorClient from "@client";

InspectorClient.message.addEventListener('disconnect', () => InspectorClient.disconnect())
