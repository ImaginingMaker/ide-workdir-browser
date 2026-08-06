import claudeCodeIcon from '@renderer/assets/agent-icons/claude-code.svg'
import codexIcon from '@renderer/assets/agent-icons/codex.svg'
import cursorIcon from '@renderer/assets/agent-icons/cursor.svg'
import geminiCliIcon from '@renderer/assets/agent-icons/gemini-cli.svg'
import kiroIcon from '@renderer/assets/agent-icons/kiro.svg'
import opencodeIcon from '@renderer/assets/agent-icons/opencode.svg'
import traeIcon from '@renderer/assets/agent-icons/trae.svg'
import vscodeIcon from '@renderer/assets/agent-icons/vscode.svg'
import windsurfIcon from '@renderer/assets/agent-icons/windsurf.svg'
import zedIcon from '@renderer/assets/agent-icons/zed.svg'
import { Icon } from './Icon'

const brandIconByAgentId: Readonly<Record<string, string>> = {
  claude: claudeCodeIcon,
  codex: codexIcon,
  cursor: cursorIcon,
  gemini: geminiCliIcon,
  kiro: kiroIcon,
  opencode: opencodeIcon,
  trae: traeIcon,
  vscode: vscodeIcon,
  windsurf: windsurfIcon,
  zed: zedIcon
}

interface AgentIconProps {
  agentId: string
  fallback: string
  size?: number
}

export const AgentIcon = ({ agentId, fallback, size = 20 }: AgentIconProps): React.JSX.Element => {
  const brandIcon = brandIconByAgentId[agentId]

  return (
    <span
      className={`agent-icon ${brandIcon ? 'agent-icon--brand' : 'agent-icon--fallback'}`}
      aria-hidden="true"
      style={{ width: size + 4, height: size + 4 }}
    >
      {brandIcon ? (
        <img src={brandIcon} alt="" width={size} height={size} draggable={false} />
      ) : (
        <Icon name={fallback} size={size} />
      )}
    </span>
  )
}
