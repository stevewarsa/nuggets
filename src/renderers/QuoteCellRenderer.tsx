import {updateAllMatches} from "../models/passage-utils.ts";

const QuoteCellRenderer = (props) => (
    <span dangerouslySetInnerHTML={{__html: updateAllMatches(props.searchString, props.value)}}/>
);

export default QuoteCellRenderer;