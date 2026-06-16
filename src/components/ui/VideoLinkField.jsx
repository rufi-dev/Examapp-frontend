import { FiVideo } from "react-icons/fi";
import { Field, inputClass } from "./Field";
import ToggleSection from "./ToggleSection";

// Optional video solution: off = none; on = a link shown in the review.
const VideoLinkField = ({ enabled, value, onToggle, onChange }) => (
  <ToggleSection
    icon={FiVideo}
    title="Video həll"
    description="İmtahandan sonra nəticə səhifəsində göstərilən video link."
    enabled={enabled}
    onToggle={onToggle}
  >
    <Field label="Video link" htmlFor="videoLink">
      <input
        id="videoLink"
        name="videoLink"
        type="url"
        value={value || ""}
        onChange={onChange}
        className={inputClass}
        placeholder="https://youtube.com/..."
      />
    </Field>
  </ToggleSection>
);

export default VideoLinkField;
